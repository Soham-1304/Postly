import { Context } from 'grammy';
import { prisma } from '../../../config/db';
import { BotContext } from '../types';

/**
 * /status command - Show user's 5 most recent posts with platform statuses
 */
export const handleStatus = async (ctx: BotContext) => {
  try {
    if (!ctx.userId) {
      return ctx.reply(
        '❌ Please link your account first. Use /start to get started.'
      );
    }

    const posts = await prisma.post.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { platformPosts: true },
    });

    if (posts.length === 0) {
      return ctx.reply('📭 No posts yet. Type /post to create one!');
    }

    const statusText = posts
      .map((post) => {
        const statuses = post.platformPosts
          .map((pp) => `${pp.platform}: ${pp.status}`)
          .join(' | ');
        const idea = post.idea.substring(0, 50);
        const createdAt = new Date(post.createdAt).toLocaleDateString();
        return `📌 "${idea}${post.idea.length > 50 ? '...' : ''}"\n${statuses}\n_${createdAt}_`;
      })
      .join('\n\n');

    return ctx.reply(`📊 Your last 5 posts:\n\n${statusText}`);
  } catch (error) {
    console.error('Error in /status command:', error);
    return ctx.reply('❌ An error occurred. Please try again.');
  }
};
