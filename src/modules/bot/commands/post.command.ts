import { InlineKeyboard } from 'grammy';
import { BotContext } from '../types';

export const handlePost = async (ctx: BotContext) => {
  try {
    if (!ctx.userId) {
      return ctx.reply(
        '❌ Please link your account first. Use /start to get started.'
      );
    }

    // Reset session
    ctx.session.step = 'awaiting_post_type';
    ctx.session.postType = undefined;
    ctx.session.platforms = undefined;
    ctx.session.selectedPlatforms = [];
    ctx.session.tone = undefined;
    ctx.session.model = undefined;
    ctx.session.idea = undefined;
    ctx.session.generatedContent = undefined;
    ctx.session.timestamp = Date.now();

    const keyboard = new InlineKeyboard()
      .text('📢 Announcement', 'type:announcement').text('🧵 Thread', 'type:thread').row()
      .text('📖 Story', 'type:story').text('📣 Promotional', 'type:promotional').row()
      .text('🎓 Educational', 'type:educational').text('💬 Opinion', 'type:opinion');

    return ctx.reply('📝 What type of post is this?', {
      reply_markup: keyboard,
    });
  } catch (error) {
    console.error('Error in /post command:', error);
    return ctx.reply('❌ An error occurred. Please try again.');
  }
};