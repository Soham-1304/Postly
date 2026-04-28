import { Context } from 'grammy';
import { BotContext } from '../types';

/**
 * /help command - Show all available commands
 */
export const handleHelp = async (ctx: BotContext) => {
  return ctx.reply(
    '🤖 Postly Bot Commands:\n\n' +
      '/start - Link your account & get started\n' +
      '/post - Create a new post\n' +
      '/status - Check your recent posts\n' +
      '/accounts - Manage social accounts\n' +
      '/help - Show this message\n\n' +
      '💡 Postly generates platform-specific content with AI!'
  );
};
