import { generateText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { analyzeWebsite } from './tools/analyzeWebsite.js';
import { searchMemory } from './tools/searchMemory.js';
import { saveLead } from './tools/saveLead.js';
import { escalate } from './tools/escalate.js';
import memory from './memory.js';

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY || '',
});

const model = groq.chat(process.env.GROQ_MODEL || 'llama-3.1-8b-instant');

const systemPrompt = `You are Codeaptor AI, a technical infrastructure assistant for Codeaptor — a managed DevOps and hosting company.

Your job is to help users understand their website and infrastructure issues, perform technical audits, and capture leads for follow-up by the engineering team.

TOOLS:
- analyzeWebsite: Run a full technical audit (DNS, SSL, HTTP headers, page size, title, broken links). Always ask for the URL first.
- searchMemory: Look up past conversations with this user to remember their context.
- saveLead: Save a qualified lead with contact info and issue description. Only use when the user provides contact info (email/phone) AND a clear issue.
- escalate: Transfer to a human engineer when the user explicitly asks to speak with a person or has urgent needs.

RULES:
1. Always be helpful, professional, and concise.
2. Before running analyzeWebsite, confirm the URL with the user.
3. For lead capture: first understand their issue, then ask for contact info.
4. If the user asks to speak to a human, use the escalate tool.
5. Keep responses under 3 paragraphs for Telegram.
6. Never make up technical data — use your tools to get real information.
7. The audit report should highlight: performance issues, DNS problems, SSL expiry risks, and broken links. Be specific and actionable.`;

function createTools(context) {
  return {
    analyzeWebsite: tool({
      description: analyzeWebsite.description,
      parameters: z.object(analyzeWebsite.parameters),
      execute: async (params) => {
        return analyzeWebsite.execute(params, context);
      },
    }),
    searchMemory: tool({
      description: searchMemory.description,
      parameters: z.object(searchMemory.parameters),
      execute: async (params) => {
        return searchMemory.execute(params, context);
      },
    }),
    saveLead: tool({
      description: saveLead.description,
      parameters: z.object(saveLead.parameters),
      execute: async (params) => {
        return saveLead.execute(params, context);
      },
    }),
    escalate: tool({
      description: escalate.description,
      parameters: z.object(escalate.parameters),
      execute: async (params) => {
        return escalate.execute(params, context);
      },
    }),
  };
}

function formatAuditResponse(result) {
  const { url, hostname, dns, ssl, page, loadTimeMs } = result;

  let msg = `🔍 *Audit Report for ${hostname}*\n\n`;

  if (page.title) msg += `*Title:* ${page.title}\n`;
  if (page.status) msg += `*HTTP Status:* ${page.status}\n`;
  if (page.sizeKB) msg += `*Page Size:* ${page.sizeKB} KB\n`;
  if (page.server) msg += `*Server:* ${page.server}\n`;
  msg += `*Load Time:* ${loadTimeMs}ms\n\n`;

  if (dns && dns.a) {
    msg += `🌐 *DNS A Records:* ${dns.a.join(', ')}\n`;
  }
  if (ssl) {
    const status = ssl.daysRemaining !== null && ssl.daysRemaining > 30
      ? '✅ Valid'
      : ssl.daysRemaining !== null && ssl.daysRemaining > 0
        ? `⚠️ Expires in ${ssl.daysRemaining} days`
        : '❌ Expired';
    msg += `🔒 *SSL:* ${status}`;
    if (ssl.issuer) msg += ` (${ssl.issuer})`;
    msg += '\n';
  }

  if (page.brokenLinks !== undefined) {
    msg += `\n🔗 *Links:* ${page.totalLinks || 0} total`;
    if (page.brokenLinks > 0) {
      msg += `, ${page.brokenLinks} broken`;
    }
    msg += '\n';
  }

  return msg;
}

export async function runAgent({ userId, message, username, sessionId }) {
  const context = { userId, username, sessionId };

  const [recentHistory, similarHistory] = await Promise.all([
    memory.getRecent({ userId, limit: 10, sessionId }),
    memory.searchSimilar({ userId, query: message, limit: 3 }),
  ]);

  await memory.addMessage({ userId, role: 'user', content: message, sessionId });

  const fullHistory = [];

  if (similarHistory.length > 0) {
    fullHistory.push({
      role: 'system',
      content: `Relevant past context:\n${similarHistory.map(m => `[${m.role}] ${m.content.slice(0, 300)}`).join('\n')}`,
    });
  }

  for (const msg of recentHistory) {
    fullHistory.push({ role: msg.role, content: msg.content });
  }

  fullHistory.push({ role: 'user', content: message });

  const tools = createTools(context);

  const result = await generateText({
    model,
    system: systemPrompt,
    messages: fullHistory,
    tools,
    maxSteps: 15,
  });

  const responseText = result.text || 'I processed your request.';

  await memory.addMessage({ userId, role: 'assistant', content: responseText, sessionId });

  const response = {
    text: responseText,
    data: null,
  };

  for (const step of result.steps || []) {
    for (const call of step.toolCalls || []) {
      if (call.toolName === 'analyzeWebsite' && call.result) {
        response.data = {
          type: 'audit_report',
          content: call.result,
          formatted: formatAuditResponse(call.result),
        };
      }
      if (call.toolName === 'saveLead' && call.result?.saved) {
        response.data = {
          type: 'lead_saved',
          content: call.result,
        };
      }
      if (call.toolName === 'escalate' && call.result?.escalated) {
        response.data = {
          type: 'escalated',
          content: call.result,
        };
      }
    }
  }

  return response;
}
