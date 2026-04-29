import { prisma } from '../../config/db';

export interface DashboardStats {
  totalPosts: number;
  publishedPosts: number;
  failedPosts: number;
  queuedPosts: number;
  cancelledPosts: number;
  successRate: number; // percentage 0-100
  byPlatform: {
    platform: string;
    total: number;
    published: number;
    failed: number;
    queued: number;
    cancelled: number;
  }[];
}

export class DashboardService {
  async getStats(userId: string): Promise<DashboardStats> {
    // Get total posts and by status
    const totalPosts = await prisma.post.count({
      where: { userId }
    });

    const publishedPosts = await prisma.post.count({
      where: { userId, status: 'published' }
    });

    const failedPosts = await prisma.post.count({
      where: { userId, status: 'failed' }
    });

    const queuedPosts = await prisma.post.count({
      where: { userId, status: 'queued' }
    });

    const cancelledPosts = await prisma.post.count({
      where: { userId, status: 'cancelled' }
    });

    // Calculate success rate
    const successRate = totalPosts > 0 ? (publishedPosts / totalPosts) * 100 : 0;

    // Get per-platform breakdown
    const platformStats = await prisma.platformPost.groupBy({
      by: ['platform', 'status'],
      where: {
        post: { userId }
      },
      _count: true
    });

    // Organize platform data
    const platformMap = new Map<string, { [key: string]: number }>();

    platformStats.forEach((stat) => {
      const platform = stat.platform.toLowerCase();
      if (!platformMap.has(platform)) {
        platformMap.set(platform, {
          published: 0,
          failed: 0,
          queued: 0,
          cancelled: 0
        });
      }
      const counts = platformMap.get(platform)!;
      counts[stat.status] = stat._count;
    });

    // Build platform array
    const byPlatform = Array.from(platformMap.entries()).map(([platform, counts]) => ({
      platform,
      total: Object.values(counts).reduce((sum, val) => sum + val, 0),
      published: counts.published || 0,
      failed: counts.failed || 0,
      queued: counts.queued || 0,
      cancelled: counts.cancelled || 0
    }));

    return {
      totalPosts,
      publishedPosts,
      failedPosts,
      queuedPosts,
      cancelledPosts,
      successRate: Math.round(successRate * 100) / 100, // Round to 2 decimals
      byPlatform
    };
  }
}
