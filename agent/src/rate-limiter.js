import logger from './middlewares/logger.js';

const MAX_TOKENS_PER_MIN = parseInt(process.env.LLM_MAX_TOKENS_PER_MIN || '5500', 10);
const WINDOW_MS = 60000;
const MODELS_COOLDOWN_MS = 65000;

const MODELS = [
  { id: 'llama-3.1-8b-instant', cooldownUntil: 0 },
  { id: 'gemma2-9b-it', cooldownUntil: 0 },
  { id: 'llama-3.2-3b-preview', cooldownUntil: 0 },
  { id: 'mixtral-8x7b-32768', cooldownUntil: 0 },
];

let activeModelIndex = 0;

export function getActiveModel() {
  const now = Date.now();
  for (let i = 0; i < MODELS.length; i++) {
    const idx = (activeModelIndex + i) % MODELS.length;
    if (MODELS[idx].cooldownUntil <= now) {
      activeModelIndex = idx;
      return MODELS[idx].id;
    }
  }
  return null;
}

export function reportModelError(modelId) {
  const model = MODELS.find(m => m.id === modelId);
  if (model) {
    model.cooldownUntil = Date.now() + MODELS_COOLDOWN_MS;
    logger.warn('Model cooling down', { model: modelId, durationMs: MODELS_COOLDOWN_MS });
    return true;
  }
  return false;
}

export function isRateLimitError(err) {
  const msg = err?.message || '';
  return msg.includes('Rate limit')
    || msg.includes('429')
    || msg.includes('rate_limit_exceeded')
    || msg.includes('Too Many Requests');
}

export async function waitForAnyModel() {
  for (;;) {
    const available = getActiveModel();
    if (available) return available;

    const soonest = MODELS.reduce((a, b) => a.cooldownUntil < b.cooldownUntil ? a : b);
    const waitMs = Math.max(soonest.cooldownUntil - Date.now() + 200, 1000);
    logger.warn('All models cooling down, waiting', {
      waitMs: Math.ceil(waitMs),
      models: MODELS.map(m => ({ id: m.id, remainingS: Math.max(0, Math.ceil((m.cooldownUntil - Date.now()) / 1000)) })),
    });
    await new Promise(r => setTimeout(r, Math.min(waitMs, 30000)));
  }
}

export function getModelList() {
  return MODELS.map(m => m.id);
}

const usageWindow = [];
let processingLock = false;
const pendingQueue = [];

function estimateTokens(...texts) {
  let total = 0;
  for (const t of texts) {
    if (!t) continue;
    total += Math.ceil(t.length / 3.5);
  }
  return Math.max(total, 500);
}

function purgeWindow() {
  const now = Date.now();
  while (usageWindow.length > 0 && now - usageWindow[0].time > WINDOW_MS) {
    usageWindow.shift();
  }
}

async function waitForCapacity(estimatedTokens) {
  purgeWindow();
  const used = usageWindow.reduce((s, t) => s + t.count, 0);
  const remaining = MAX_TOKENS_PER_MIN - used;

  if (estimatedTokens > remaining) {
    const oldest = usageWindow[0]?.time || Date.now();
    const waitMs = WINDOW_MS - (Date.now() - oldest) + 200;
    logger.warn('Throttling LLM request', {
      used, estimated: estimatedTokens, remaining, waitMs: Math.ceil(waitMs),
    });
    await new Promise(r => setTimeout(r, waitMs));
    purgeWindow();
  }
}

function recordUsage(actualTokens) {
  if (usageWindow.length > 0) {
    usageWindow[usageWindow.length - 1].count = actualTokens;
  }
}

function pushEstimate(count) {
  usageWindow.push({ time: Date.now(), count: Math.max(count, 100) });
}

export async function withRateLimit(inputTokens, fn) {
  if (processingLock) {
    await new Promise(resolve => pendingQueue.push(resolve));
  }

  processingLock = true;
  try {
    await waitForCapacity(inputTokens);
    pushEstimate(inputTokens);
    const result = await fn();

    const actual = result?.usage?.totalTokens
      || (result?.usage?.promptTokens || 0) + (result?.usage?.completionTokens || 0);
    if (actual > 0) {
      recordUsage(actual);
      logger.debug('LLM token usage', { estimated: inputTokens, actual });
    }

    return result;
  } finally {
    processingLock = false;
    if (pendingQueue.length > 0) {
      pendingQueue.shift()();
    }
  }
}

export function estimateInputTokens(systemPrompt, messages, userMessage) {
  let total = systemPrompt ? estimateTokens(systemPrompt) : 0;
  for (const msg of messages || []) {
    total += estimateTokens(msg.content);
  }
  total += estimateTokens(userMessage);
  total += 500;
  return total;
}
