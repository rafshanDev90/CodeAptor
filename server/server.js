import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import https from 'https';
import { connectDB } from './src/config/database.js';
import app, { bot, SECURE_WEBHOOK_ROUTE } from './app.js';

const PORT = process.env.PORT || 8443;

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
  bot.stop('SIGTERM');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
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
    console.log('[SSL] HTTPS server configured');
  } else {
    const { default: http } = await import('http');
    server = http.createServer(app);
    console.log('[SSL] No certs found — falling back to HTTP');
  }

  server.listen(PORT, async () => {
    console.log(`[SERVER] Codeaptor online on port ${PORT}`);

    const vpsIp = process.env.VPS_IP;

    if (vpsIp && vpsIp !== 'your_vps_public_ip_here' && fs.existsSync('./ssl/cert.pem')) {
      try {
        const webhookUrl = `https://${vpsIp}:${PORT}${SECURE_WEBHOOK_ROUTE}`;
        await bot.telegram.setWebhook(webhookUrl, {
          certificate: { source: fs.readFileSync('./ssl/cert.pem'), filename: 'cert.pem' },
        });
        console.log(`[WEBHOOK] Registered: ${webhookUrl}`);
      } catch (err) {
        console.error('[WEBHOOK] Registration failed:', err.message);
      }
    } else {
      console.log('[WEBHOOK] No VPS_IP configured — falling back to long-polling');
      bot.launch().catch(err => console.error('[POLLING] Failed:', err.message));
    }
  });
};

start();
