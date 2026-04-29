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
        'Please link your account first. Use /start to get started.'
      );
    }

    const posts = await prisma.post.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { platformPosts: true },
    });

    if (posts.length === 0) {
      return ctx.reply('No posts yet. Type /post to create one!');
    }

    const statusText = posts
      .map((post) => {
        const typeStr = post.postType 
          ? post.postType.charAt(0).toUpperCase() + post.postType.slice(1) 
          : 'Post';
          
        let str = `[ ${typeStr} ]\n`;
        const idea = post.idea.substring(0, 80).replace(/\n/g, ' ');
        str += `"${idea}${post.idea.length > 80 ? '...' : ''}"\n\n`;
        
        post.platformPosts.forEach((pp) => {
          let st = pp.status.charAt(0).toUpperCase() + pp.status.slice(1);
          let icon = '•';
          if (pp.status === 'published') icon = '[✓]';
          if (pp.status === 'failed') icon = '[✕]';
          if (pp.status === 'queued') icon = '[-]';
          if (pp.status === 'processing') icon = '[~]';
          
          const pName = pp.platform.charAt(0).toUpperCase() + pp.platform.slice(1);
          str += `${icon} ${pName}: ${st}\n`;
        });
        
        const createdAt = new Date(post.createdAt).toLocaleDateString();
        str += `\nDate: ${createdAt}`;
        return str;
      })
      .join('\n\n─────────────────\n\n');

    return ctx.reply(`*Your Last 5 Posts*\n\n─────────────────\n\n${statusText}`, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /status command:', error);
    return ctx.reply('An error occurred. Please try again.');
  }
};
