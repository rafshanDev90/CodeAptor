import { Telegraf, session } from 'telegraf';
import dotenv from 'dotenv';
import logger from '../middlewares/logger.js';

dotenv.config();

if (!process.env.BOT_TOKEN) {
  throw new Error('CRITICAL: BOT_TOKEN missing in environment');
}

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

// Global Telegraf error boundary to keep the production bot online
bot.catch((err, ctx) => {
  logger.error('Telegraf global error', { updateId: ctx?.update?.update_id, error: err.message });
  ctx.reply('⚠️ An unexpected error occurred. Please try again or contact support.').catch(replyErr => {
    logger.error('Failed to send error message to user', { error: replyErr.message });
  });
});

export default bot;
