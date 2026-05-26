import supabase from '../config/database.js';
import logger from '../middlewares/logger.js';

export const registerBotCommands = (bot) => {

  bot.start((ctx) => {
    ctx.reply(
      `🚀 *Codeaptor Server Monitoring*\n\n` +
      `I monitor your servers and alert you when something needs attention.\n\n` +
      `*Commands:*\n` +
      `/status — View server health\n` +
      `/alerts — View open alerts\n` +
      `/ack\\_N — Acknowledge alert (e.g., /ack\\_42)\n` +
      `/help — Full command list`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.help((ctx) => {
    ctx.reply(
      `*Commands:*\n\n` +
      `/status — Show all servers and latest check results\n` +
      `/alerts — List all unresolved alerts\n` +
      `/ack\\_N — Acknowledge alert by ID (from /alerts)\n` +
      `/start — Welcome message\n` +
      `/help — This message\n\n` +
      `Alerts are sent automatically when a server metric exceeds its threshold.`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('status', async (ctx) => {
    try {
      const chatId = ctx.from.id;
      const { data: servers } = await supabase
        .from('servers')
        .select('*')
        .or(`telegram_chat_id.eq.${chatId},type.eq.self`);

      if (!servers || servers.length === 0) {
        return ctx.reply('No servers found.');
      }

      const lines = ['📊 *Server Status*', ''];

      for (const server of servers) {
        const { data: checks } = await supabase
          .from('checks')
          .select('check_type, status, value, message')
          .eq('server_id', server.id)
          .order('checked_at', { ascending: false })
          .limit(6);

        const statusMap = { pass: '✅', warning: '⚠️', fail: '🔴', error: '⚪' };
        lines.push(`*${server.name}*`);

        if (checks) {
          const seen = new Set();
          for (const c of checks) {
            if (seen.has(c.check_type)) continue;
            seen.add(c.check_type);
            lines.push(`${statusMap[c.status] || '⚪'} ${c.check_type.toUpperCase()}: ${c.message}`);
          }
        }
        lines.push('');
      }

      await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
    } catch (err) {
      logger.error('/status failed', { error: err.message });
      await ctx.reply('Failed to fetch server status.');
    }
  });

  bot.command('alerts', async (ctx) => {
    try {
      const chatId = ctx.from.id;
      const { data: servers } = await supabase
        .from('servers')
        .select('id, name')
        .or(`telegram_chat_id.eq.${chatId},type.eq.self`);

      if (!servers || servers.length === 0) return ctx.reply('No servers found.');

      const serverIds = servers.map(s => s.id);
      const { data: alerts } = await supabase
        .from('alerts')
        .select('*, servers(name)')
        .in('server_id', serverIds)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!alerts || alerts.length === 0) {
        return ctx.reply('✅ No open alerts. Everything looks healthy.');
      }

      const lines = ['🔔 *Open Alerts*', ''];
      for (const a of alerts) {
        const emoji = a.severity === 'fail' ? '🔴' : '⚠️';
        lines.push(`${emoji} *${a.servers?.name || 'Unknown'}* — ${a.check_type.toUpperCase()}`);
        lines.push(`   ${a.message}`);
        lines.push(`   \`/ack_${a.id}\` to acknowledge`);
        lines.push('');
      }

      await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
    } catch (err) {
      logger.error('/alerts failed', { error: err.message });
      await ctx.reply('Failed to fetch alerts.');
    }
  });

  bot.hears(/\/ack_(\d+)/, async (ctx) => {
    try {
      const alertId = ctx.match[1];
      const chatId = ctx.from.id;

      const { data: alert } = await supabase
        .from('alerts')
        .select('*, servers!inner(*)')
        .eq('id', alertId)
        .single();

      if (!alert) return ctx.reply('Alert not found.');

      const server = alert.servers;
      if (server.telegram_chat_id && server.telegram_chat_id !== chatId) {
        return ctx.reply('This alert does not belong to you.');
      }

      await supabase
        .from('alerts')
        .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
        .eq('id', alertId);

      await ctx.reply(`✅ Alert acknowledged for *${server.name}*.`, { parse_mode: 'Markdown' });
      logger.info('Alert acknowledged', { alertId, by: chatId });
    } catch (err) {
      logger.error('/ack failed', { error: err.message });
      await ctx.reply('Failed to acknowledge alert.');
    }
  });

  bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    await ctx.reply(
      'Use /status to check your servers or /help for all commands.',
      { parse_mode: 'Markdown' }
    );
  });
};
