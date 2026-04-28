import { Context } from 'grammy';
import { prisma } from '../../../config/db';
import { BotContext } from '../types';

/**
 * /accounts command - List user's connected social accounts
 */
export const handleAccounts = async (ctx: BotContext) => {
  try {
    if (!ctx.userId) {
      return ctx.reply(
        '❌ Please link your account first. Use /start to get started.'
      );
    }

    const accounts = await prisma.socialAccount.findMany({
      where: { userId: ctx.userId },
    });

    if (accounts.length === 0) {
      const baseUrl = process.env.APP_BASE_URL || 'https://postly.app';
      return ctx.reply(
        `📱 No social accounts connected yet.\n\nConnect your accounts at:\n${baseUrl}/accounts`
      );
    }

    const accountsText = accounts
      .map((acc) => `✅ ${acc.platform}: ${acc.handle}`)
      .join('\n');

    return ctx.reply(`📱 Your connected accounts:\n\n${accountsText}`);
  } catch (error) {
    console.error('Error in /accounts command:', error);
    return ctx.reply('❌ An error occurred. Please try again.');
  }
};
