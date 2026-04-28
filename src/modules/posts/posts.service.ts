import { prisma } from '../../config/db';
import { publishQueue, PublishJobData } from '../queue/queue';
import { ContentService } from '../content/content.service';

const contentService = new ContentService();

export class PostsService {
  async publishPost(
    userId: string,
    data: {
      idea: string;
      post_type: string;
      platforms: string[];
      tone: string;
      language: string;
      model: string;
    }
  ) {
    const generated = await contentService.generateContent({
      ...data,
      userId,
      model: data.model as 'gemini' | 'openai' | 'anthropic'
    });

    const post = await prisma.post.create({
      data: {
        userId,
        idea: data.idea,
        postType: data.post_type,
        tone: data.tone,
        language: data.language,
        modelUsed: generated.model_used,
        status: 'queued',
        publishAt: null
      }
    });

    const platformPosts = await Promise.all(
      data.platforms.map(async (platform) => {
        const content = generated.generated[platform].content;

        const platformPost = await prisma.platformPost.create({
          data: {
            postId: post.id,
            platform,
            content,
            status: 'queued',
            attempts: 0
          }
        });

        const jobData: PublishJobData = {
          postId: post.id,
          platformPostId: platformPost.id,
          platform: platform as any,
          content,
          userId,
          attempts: 0
        };
        await (publishQueue as any).add(jobData as any);

        return platformPost;
      })
    );

    return {
      post,
      platformPosts,
      generated
    };
  }

  async schedulePost(
    userId: string,
    data: {
      idea: string;
      post_type: string;
      platforms: string[];
      tone: string;
      language: string;
      model: string;
      publish_at: Date;
    }
  ) {
    const { publish_at, ...postData } = data;

    const generated = await contentService.generateContent({
      ...postData,
      userId,
      model: postData.model as 'gemini' | 'openai' | 'anthropic'
    });

    const post = await prisma.post.create({
      data: {
        userId,
        idea: postData.idea,
        postType: postData.post_type,
        tone: postData.tone,
        language: postData.language,
        modelUsed: generated.model_used,
        status: 'queued',
        publishAt: publish_at
      }
    });

    const delay = Math.max(0, publish_at.getTime() - Date.now());

    const platformPosts = await Promise.all(
      postData.platforms.map(async (platform) => {
        const content = generated.generated[platform].content;

        const platformPost = await prisma.platformPost.create({
          data: {
            postId: post.id,
            platform,
            content,
            status: 'queued',
            attempts: 0
          }
        });

        const jobData: PublishJobData = {
          postId: post.id,
          platformPostId: platformPost.id,
          platform: platform as any,
          content,
          userId,
          attempts: 0
        };
        await (publishQueue as any).add(jobData as any);

        return platformPost;
      })
    );

    return { post, platformPosts, generated };
  }

  async getPosts(
    userId: string,
    filters: {
      page?: number;
      limit?: number;
      status?: string;
      platform?: string;
      date_range?: { from: Date; to: Date };
    } = {}
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (filters.status) where.status = filters.status;
    if (filters.date_range) {
      where.createdAt = {
        gte: filters.date_range.from,
        lte: filters.date_range.to
      };
    }

    const total = await prisma.post.count({ where });

    const posts = await prisma.post.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        platformPosts: filters.platform
          ? { where: { platform: filters.platform } }
          : true
      }
    });

    return {
      posts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getPost(userId: string, postId: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        platformPosts: true
      }
    });

    if (!post) throw new Error('Post not found');
    if (post.userId !== userId) throw new Error('Unauthorized');

    return post;
  }

  async retryPost(userId: string, postId: string) {
    const post = await this.getPost(userId, postId);

    const failedPlatforms = post.platformPosts.filter(
      (pp) => pp.status === 'failed'
    );

    if (failedPlatforms.length === 0) {
      throw new Error('No failed platforms to retry');
    }

    for (const platformPost of failedPlatforms) {
      const jobData: PublishJobData = {
        postId: post.id,
        platformPostId: platformPost.id,
        platform: platformPost.platform as any,
        content: platformPost.content,
        userId,
        attempts: platformPost.attempts
      };

      await (publishQueue as any).add(jobData as any);

      await prisma.platformPost.update({
        where: { id: platformPost.id },
        data: { status: 'queued', errorMessage: null }
      });
    }

    return { retried: failedPlatforms.length };
  }

  async cancelPost(userId: string, postId: string) {
    const post = await this.getPost(userId, postId);

    if (post.status !== 'queued') {
      throw new Error('Can only cancel queued posts');
    }

    const jobs = await (publishQueue as any).getJobs(
      ['waiting', 'delayed', 'active'],
      0,
      -1
    );
    const postJobs = jobs.filter((j: any) => j.data.postId === postId);

    for (const job of postJobs) {
      await job.remove();
    }

    await prisma.post.update({
      where: { id: postId },
      data: { status: 'cancelled' }
    });

    await prisma.platformPost.updateMany({
      where: { postId },
      data: { status: 'cancelled' }
    });

    return { cancelled: true };
  }
}
