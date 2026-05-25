const AGENT_URL = process.env.AGENT_URL || 'http://localhost:3001';

async function chatWithAgent({ userId, message, username, sessionId }) {
  const response = await fetch(`${AGENT_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, message, username, sessionId }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Agent request failed' }));
    throw new Error(err.error || `Agent returned ${response.status}`);
  }

  return response.json();
}

async function healthCheck() {
  try {
    const response = await fetch(`${AGENT_URL}/health`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

export { chatWithAgent, healthCheck };
