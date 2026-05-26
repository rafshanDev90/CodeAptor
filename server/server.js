import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import https from 'https';
import { connectDB, supabase } from './src/config/database.js';
import app, { bot, SECURE_WEBHOOK_ROUTE } from './app.js';
import logger from './src/middlewares/logger.js';
import { startMonitoring } from './src/services/monitor.scheduler.js';

const PORT = process.env.PORT || 8443;

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason });
  bot.stop('SIGTERM');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { err: err.message, stack: err.stack });
  bot.stop('SIGTERM');
  process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

const start = async () => {
  await connectDB();

  let server;

  if (fs.existsSync('./ssl/key.pem') && fs.existsSync('./ssl/cert.pem')) {
    const sslOptions = {
      key: fs.readFileSync('./ssl/key.pem'),
      cert: fs.readFileSync('./ssl/cert.pem'),
    };
    server = https.createServer(sslOptions, app);
    logger.info('HTTPS server configured');
  } else {
    const { default: http } = await import('http');
    server = http.createServer(app);
    logger.warn('No SSL certs found — falling back to HTTP');
  }

  server.listen(PORT, async () => {
    logger.info(`Codeaptor server online on port ${PORT}`);

    startMonitoring(supabase, bot);

    const vpsIp = process.env.VPS_IP;

    if (vpsIp && vpsIp !== 'your_vps_public_ip_here' && fs.existsSync('./ssl/cert.pem')) {
      try {
        const webhookUrl = `https://${vpsIp}:${PORT}${SECURE_WEBHOOK_ROUTE}`;
        await bot.telegram.setWebhook(webhookUrl, {
          certificate: { source: fs.readFileSync('./ssl/cert.pem'), filename: 'cert.pem' },
        });
        logger.info(`Telegram webhook registered at ${webhookUrl}`);
      } catch (err) {
        logger.error('Webhook registration failed', { error: err.message });
      }
    } else {
      logger.info('No VPS_IP configured — falling back to long-polling');
      bot.launch().catch(err => logger.error('Polling start failed', { error: err.message }));
    }
  });
};

start();
