import { runChecks, checkNeedsAlert, getOpenAlert } from './monitor.service.js';
import logger from '../middlewares/logger.js';

const INTERVAL_MS = parseInt(process.env.MONITOR_INTERVAL || '300000', 10);
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

function sendTelegram(bot, chatId, text) {
  if (!chatId) return;
  bot.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown' })
    .catch(err => logger.error('Alert delivery failed', { chatId, error: err.message }));
}

function severityEmoji(severity) {
  return severity === 'fail' ? '🔴' : severity === 'warning' ? '⚠️' : '✅';
}

export function startMonitoring(supabase, bot) {
  logger.info(`Monitor scheduler started (interval: ${INTERVAL_MS / 1000}s)`);

  async function runCycle() {
    try {
      const { data: servers, error } = await supabase
        .from('servers')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;
      if (!servers || servers.length === 0) return;

      for (const server of servers) {
        const results = await runChecks(server.domain || null);

        const checksToInsert = results.map(r => ({
          server_id: server.id,
          check_type: r.check_type,
          status: r.status,
          value: r.value,
          message: r.message,
          checked_at: new Date().toISOString(),
        }));

        const { error: insertError } = await supabase.from('checks').insert(checksToInsert);
        if (insertError) {
          logger.error('Check save failed', { server: server.name, error: insertError.message });
          continue;
        }

        for (const result of results) {
          if (result.status === 'pass' || result.status === 'error') {
            const openAlert = await getOpenAlert(supabase, server.id, result.check_type);
            if (openAlert) {
              await supabase
                .from('alerts')
                .update({ status: 'resolved', resolved_at: new Date().toISOString() })
                .eq('id', openAlert.id);

              const chatId = server.telegram_chat_id || ADMIN_CHAT_ID;
              sendTelegram(bot, chatId,
                `✅ *Resolved* — ${server.name}\n${result.check_type.toUpperCase()}: ${result.message}`
              );
            }
            continue;
          }

          const needsAlert = await checkNeedsAlert(supabase, server.id, result.check_type);
          if (!needsAlert) continue;

          const severity = result.status;

          await supabase.from('alerts').insert({
            server_id: server.id,
            check_type: result.check_type,
            severity,
            title: `${server.name} — ${result.check_type.toUpperCase()} ${severity === 'fail' ? 'CRITICAL' : 'WARNING'}`,
            message: result.message,
            status: 'open',
            created_at: new Date().toISOString(),
          });

          const chatId = server.telegram_chat_id || ADMIN_CHAT_ID;
          sendTelegram(bot, chatId,
            `${severityEmoji(severity)} *${server.name} — ${result.check_type.toUpperCase()} ${severity === 'fail' ? 'CRITICAL' : 'WARNING'}*\n${result.message}\n\nUse /ack to view and acknowledge alerts`
          );
          logger.info(`Alert sent`, { server: server.name, check: result.check_type, severity });
        }
      }
    } catch (err) {
      logger.error('Monitor cycle failed', { error: err.message });
    }
  }

  runCycle();
  setInterval(runCycle, INTERVAL_MS);
}
