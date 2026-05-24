import { Scenes } from 'telegraf';
import dbService from '../services/db.service.js';

const handleSceneCallbackQuery = async (ctx) => {
  if (ctx.callbackQuery) {
    try {
      await ctx.answerCbQuery().catch(() => {});
      await ctx.scene.leave();

      const data = ctx.callbackQuery.data;
      if (data === 'trigger_deploy') {
        await ctx.reply('🚧 *New Deployment* — This service is coming soon. Contact @your_telegram_username for immediate assistance.', { parse_mode: 'Markdown' });
      } else if (data === 'talk_engineer') {
        await ctx.reply(
          `💬 *Direct Engineering Access*\n\n` +
          `Skip the support ticket line. Contact our infrastructure lead directly at @Rafshan for immediate migration consulting.`,
          { parse_mode: 'Markdown' }
        );
      } else if (data === 'trigger_audit') {
        await ctx.scene.enter('HOSTING_AUDIT_SCENE');
      }
    } catch (err) {
      console.error('[SCENE CALLBACK ERROR]', err.message);
    }
    return true;
  }
  return false;
};

export const auditScene = new Scenes.WizardScene(
  'HOSTING_AUDIT_SCENE',

  (ctx) => {
    ctx.reply(
      '🌐 Please send your current website URL and describe any performance issues you are noticing (e.g., random crashes, slow checkout pages):'
    );
    return ctx.wizard.next();
  },

  async (ctx) => {
    if (await handleSceneCallbackQuery(ctx)) return;

    if (!ctx.message || !ctx.message.text) {
      return ctx.reply('⚠️ Please describe your website URL and performance issues in a text message.');
    }
    ctx.wizard.state.clientIssue = ctx.message.text;

    await ctx.reply(
      `🎯 *Our Managed Infrastructure Strategy:*\n\n` +
      `Cheap shared hosting forces you onto congested servers. Codeaptor migrates your application onto isolated container configurations with optimized Nginx reverse proxies and real-time database caching.\n\n` +
      `*How we work:* We build, configure, protect, and monitor your infrastructure for a single predictable monthly maintenance fee. No complex cloud bills for you.\n\n` +
      `👉 Please provide your *Contact Email or Phone Number* so an engineer can analyze your website and prepare an optimization plan:`,
      { parse_mode: 'Markdown' }
    );
    return ctx.wizard.next();
  },

  async (ctx) => {
    if (await handleSceneCallbackQuery(ctx)) return;

    if (!ctx.message || !ctx.message.text) {
      return ctx.reply('⚠️ Please provide your contact details (email or phone number) as a text message.');
    }
    ctx.wizard.state.contactInfo = ctx.message.text;

    const payload = {
      userId: ctx.from.id,
      username: ctx.from.username,
      issue: ctx.wizard.state.clientIssue,
      contact: ctx.wizard.state.contactInfo,
      source: 'audit',
    };

    try {
      await dbService.saveLead(payload);
      console.log('[LEAD CAPTURED]', payload);
    } catch (err) {
      console.error('[LEAD SAVE ERROR]', err.message);
    }

    await ctx.reply(
      `✅ *Audit Inquiry Successfully Registered!*\n\n` +
      `Our engineering team is scanning your application's current DNS, response delays, and SSL structure. We will reach back out within 2 hours to walk you through your dedicated VPS migration layout.`,
      { parse_mode: 'Markdown' }
    );

    return ctx.scene.leave();
  }
);
