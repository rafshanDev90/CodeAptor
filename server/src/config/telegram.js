import { Telegraf, session } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.BOT_TOKEN) {
  throw new Error('CRITICAL: BOT_TOKEN missing in environment');
}

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

// Global Telegraf error boundary to keep the production bot online
bot.catch((err, ctx) => {
  console.error(`[TELEGRAF GLOBAL ERROR] Update ID ${ctx?.update?.update_id || 'unknown'} failed:`, err);
  ctx.reply('⚠️ An unexpected error occurred. Please try again or contact support.').catch(replyErr => {
    console.error('[TELEGRAF ERROR] Could not send error message to user:', replyErr.message);
  });
});

export default bot;
