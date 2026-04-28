import { webhookCallback } from 'grammy';
import { Router, Request, Response } from 'express';
import { bot } from './bot';
import { env } from '../../config/env';

export const botRouter = Router();

/**
 * Middleware to validate webhook secret
 * Ensures only Telegram Bot API can send requests to this endpoint
 */
const validateWebhookSecret = (req: Request, res: Response, next: () => void) => {
  const secret = req.headers['x-telegram-bot-api-secret-token'] as string;
  if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
    console.warn('❌ Unauthorized webhook request: invalid secret token');
    return res.status(403).json({ error: 'Invalid webhook secret' });
  }
  next();
};

/**
 * POST /webhook - Receive Telegram updates
 * Protected by webhook secret validation
 */
botRouter.post('/webhook', validateWebhookSecret, webhookCallback(bot, 'express'));
