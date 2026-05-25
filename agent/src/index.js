import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { runAgent } from './agent.js';

const PORT = process.env.AGENT_PORT || 3001;

const app = express();

app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', provider: 'groq', model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant' });
});

app.post('/api/chat', async (req, res, next) => {
  try {
    const { userId, message, username, sessionId } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message are required' });
    }

    const result = await runAgent({
      userId,
      message,
      username: username || 'unknown',
      sessionId: sessionId || `${userId}`,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  console.error('[AGENT ERROR]', err);
  res.status(500).json({
    error: 'Agent processing failed',
    message: err.message,
  });
});

app.listen(PORT, () => {
  console.log(`[AGENT] Codeaptor AI agent listening on port ${PORT}`);
  console.log(`[AGENT] Provider: groq | Model: ${process.env.GROQ_MODEL || 'llama-3.1-8b-instant'}`);
});
