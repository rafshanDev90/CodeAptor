import { chatWithAgent } from '../agent-client.js';

async function handleWithAgent(ctx, message) {
  try {
    await ctx.sendChatAction('typing');

    const result = await chatWithAgent({
      userId: ctx.from.id,
      username: ctx.from.username || 'unknown',
      message,
      sessionId: `${ctx.from.id}`,
    });

    const formattedData = result.data?.formatted;

    if (formattedData) {
      await ctx.reply(formattedData, { parse_mode: 'Markdown' });
    } else if (result.text) {
      await ctx.reply(result.text, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    console.error('[AGENT ERROR]', err.message);
    await ctx.reply(
      '⚠️ I\'m having trouble connecting to my AI engine right now. Please try again in a moment, or contact @Rafshan directly.'
    );
  }
}

export const registerBotCommands = (bot) => {

  bot.start((ctx) => {
    ctx.reply(
      `🚀 *Welcome to Codeaptor Infrastructure Systems*\n\n` +
      `We eliminate your cloud server overhead. You build your application, and we deploy, secure, monitor, and scale it on isolated, high-performance bare VPS hardware.\n\n` +
      `*What is your current infrastructure requirement?*`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '⚠️ My Website is Slow / Broken', callback_data: 'trigger_audit' }
            ],
            [
              { text: '🚀 Deploy a New Project', callback_data: 'trigger_deploy' }
            ],
            [
              { text: '📊 Speak with an Engineer', callback_data: 'talk_engineer' }
            ]
          ]
        }
      }
    );
  });

  bot.help((ctx) => {
    ctx.reply(
      `*Codeaptor Bot Commands:*\n\n` +
      `/start - Begin infrastructure assessment\n` +
      `/help - Show this help message\n\n` +
      `*You can also just describe your infrastructure needs in your own words and I\'ll help you out.*`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('trigger_audit', async (ctx) => {
    try {
      await ctx.answerCbQuery().catch(() => {});
      await handleWithAgent(ctx, 'I want to audit my website');
    } catch (err) {
      console.error('[BOT ACTION ERROR] trigger_audit:', err);
    }
  });

  bot.action('trigger_deploy', async (ctx) => {
    try {
      await ctx.answerCbQuery().catch(() => {});
      await handleWithAgent(ctx, 'I want to deploy a new project');
    } catch (err) {
      console.error('[BOT ACTION ERROR] trigger_deploy:', err);
    }
  });

  bot.action('talk_engineer', async (ctx) => {
    try {
      await ctx.answerCbQuery().catch(() => {});
      await handleWithAgent(ctx, 'I want to speak with a human engineer');
    } catch (err) {
      console.error('[BOT ACTION ERROR] talk_engineer:', err);
    }
  });

  bot.on('text', async (ctx) => {
    try {
      await handleWithAgent(ctx, ctx.message.text);
    } catch (err) {
      console.error('[BOT TEXT ERROR]', err);
    }
  });
};
