import { Bot, session } from 'grammy';
import { RedisAdapter } from '@grammyjs/storage-redis';
import { env } from '../../config/env';
import { prisma } from '../../config/db';
import { redis } from '../../config/redis';
import { BotContext, ConversationSession } from './types';
import { handleStart } from './commands/start.command';
import { handlePost } from './commands/post.command';
import { handleStatus } from './commands/status.command';
import { handleAccounts } from './commands/accounts.command';
import { handleHelp } from './commands/help.command';
import {
  handleConversationStep,
  handleCallbackQuery,
} from './conversations/publish.conversation';

export const bot = new Bot<BotContext>(env.TELEGRAM_BOT_TOKEN);

// ─── Session Middleware (Redis) ───────────────────────────────────────────────
bot.use(
  session({
    initial: (): ConversationSession => ({
      step: null,
      selectedPlatforms: [],
      timestamp: Date.now(),
    }),
    storage: new RedisAdapter({
      instance: redis,
      ttl: 30 * 60, // 30 min
    }),
    getSessionKey: (ctx) => ctx.chat?.id ? `bot:session:${ctx.chat.id}` : undefined,
  })
);

// ─── Attach Postly user to context ───────────────────────────────────────────
bot.use(async (ctx, next) => {
  const chatId = ctx.chat?.id?.toString();
  if (chatId) {
    try {
      const user = await prisma.user.findUnique({
        where: { telegramChatId: chatId },
      });
      if (user) ctx.userId = user.id;
    } catch (err) {
      console.error('Failed to load user for chat', chatId, err);
    }
  }
  ctx.session.timestamp = Date.now();
  await next();
});

// ─── Session Timeout (30 min inactivity) ─────────────────────────────────────
bot.use(async (ctx, next) => {
  const now = Date.now();
  const inactive = now - (ctx.session.timestamp || now);
  if (inactive > 30 * 60 * 1000 && ctx.session.step !== null) {
    ctx.session = { step: null, selectedPlatforms: [], timestamp: now };
    await ctx.reply('⏰ Session expired. Type /post to start fresh.');
    return;
  }
  await next();
});

// ─── Commands ─────────────────────────────────────────────────────────────────
bot.command('start', handleStart);
bot.command('post', handlePost);
bot.command('status', handleStatus);
bot.command('accounts', handleAccounts);
bot.command('help', handleHelp);

// ─── Callback Queries (button taps) ──────────────────────────────────────────
bot.on('callback_query:data', handleCallbackQuery);

// ─── Free text messages (idea input) ─────────────────────────────────────────
bot.on('message:text', handleConversationStep);

// ─── Error Handler ────────────────────────────────────────────────────────────
bot.catch((err) => {
  console.error('❌ Bot error:', err.message, err.ctx?.update);
});

export default bot;