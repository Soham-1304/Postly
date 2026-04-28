import { InlineKeyboard } from 'grammy';
import { prisma } from '../../../config/db';
import { BotContext } from '../types';
import { verifyAccessToken } from '../../../utils/jwt';

export const handleStart = async (ctx: BotContext) => {
  try {
    if (ctx.userId) {
      const user = await prisma.user.findUnique({ where: { id: ctx.userId } });

      const keyboard = new InlineKeyboard()
        .text('✍️ Create Post', 'menu:post').row()
        .text('📊 My Posts', 'menu:status').text('🔗 Accounts', 'menu:accounts');

      return ctx.reply(
        `👋 Welcome back, ${user?.name || 'User'}!\n\nWhat would you like to do?`,
        { reply_markup: keyboard }
      );
    }

    const token = ctx.match;
    if (token && typeof token === 'string') {
      try {
        const payload = verifyAccessToken(token);
        const user = await prisma.user.update({
          where: { id: payload.id },
          data: { telegramChatId: ctx.chat?.id?.toString() }
        });
        
        ctx.userId = user.id;

        const keyboard = new InlineKeyboard()
          .text('✍️ Create Post', 'menu:post').row()
          .text('📊 My Posts', 'menu:status').text('🔗 Accounts', 'menu:accounts');

        return ctx.reply(
          `✅ Account successfully linked!\n\n👋 Welcome, ${user.name}!\n\nWhat would you like to do?`,
          { reply_markup: keyboard }
        );
      } catch (err) {
        return ctx.reply('❌ Invalid or expired link token. Please generate a new one from the dashboard and try again.');
      }
    }

    return ctx.reply(
      '👋 Welcome to *Postly*!\n\n' +
      'I help you generate and publish AI-powered content to Twitter, LinkedIn, Instagram, and Threads.\n\n' +
      '🔗 To get started, please link your Telegram account. Go to the web dashboard, copy your link token, and use:\n\n' +
      '`/start <your_token>`',
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Error in /start:', error);
    return ctx.reply('❌ An error occurred. Please try again.');
  }
};