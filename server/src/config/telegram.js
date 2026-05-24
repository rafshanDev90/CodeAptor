import { Telegraf, session } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.BOT_TOKEN) {
  throw new Error('CRITICAL: BOT_TOKEN missing in environment');
}

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

export default bot;
