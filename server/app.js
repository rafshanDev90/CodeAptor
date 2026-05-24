import express from 'express';
import cors from 'cors';
import routes from './src/routes/index.js';
import globalErrorHandler from './src/controllers/error.controller.js';
import bot from './src/config/telegram.js';
import { stage } from './src/scenes/index.js';
import { registerBotCommands } from './src/controllers/bot.controller.js';

bot.use(stage.middleware());
registerBotCommands(bot);

const SECURE_WEBHOOK_ROUTE = `/engine-gateway-${process.env.BOT_TOKEN?.slice(0, 12)}`;

const app = express();

app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use('/api/v1', routes);

app.post(SECURE_WEBHOOK_ROUTE, (req, res, next) => {
  bot.webhookCallback({ secretPath: SECURE_WEBHOOK_ROUTE })(req, res, next);
});

app.use((req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Route ${req.originalUrl} not found`,
  });
});

app.use(globalErrorHandler);

export { bot, SECURE_WEBHOOK_ROUTE };
export default app;
