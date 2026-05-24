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
      `*Or use the buttons below to get started instantly.`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('trigger_audit', (ctx) => {
    ctx.answerCbQuery();
    ctx.scene.enter('HOSTING_AUDIT_SCENE');
  });

  bot.action('trigger_deploy', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('🚧 *New Deployment* — This service is coming soon. Contact @your_telegram_username for immediate assistance.',
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('talk_engineer', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply(
      `💬 *Direct Engineering Access*\n\n` +
      `Skip the support ticket line. Contact our infrastructure lead directly at @Rafshan for immediate migration consulting.`,
      { parse_mode: 'Markdown' }
    );
  });
};
