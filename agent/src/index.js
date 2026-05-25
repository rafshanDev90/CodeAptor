import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import logger from './middlewares/logger.js';
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
  logger.error('Agent request failed', { error: err.message, stack: err.stack });
  res.status(500).json({
    error: 'Agent processing failed',
    message: err.message,
  });
});

app.listen(PORT, () => {
  logger.info(`Agent listening on port ${PORT}`);
  logger.info(`Provider: groq | Model: ${process.env.GROQ_MODEL || 'llama-3.1-8b-instant'}`);
});
