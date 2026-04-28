import { Job } from 'bullmq';
import { PublishJobData } from '../queue';
import { prisma } from '../../../config/db';

/**
 * Threads job processor (stub)
 */
export async function processThreadsJob(job: Job<PublishJobData>) {
  const { platformPostId, content, userId } = job.data;

  try {
    await prisma.platformPost.update({
      where: { id: platformPostId },
      data: { status: 'processing' }
    });

    console.log(`🧵 [STUB] Threads: Would post for user ${userId}`);
    console.log(`Content preview: ${content.substring(0, 80)}...`);

    await new Promise((r) => setTimeout(r, 500));

    await prisma.platformPost.update({
      where: { id: platformPostId },
      data: {
        status: 'published',
        publishedAt: new Date(),
        attempts: job.attemptsMade
      }
    });

    console.log(`✅ Threads: Successfully posted (stub)`);
    return { success: true, stubPost: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    await prisma.platformPost.update({
      where: { id: platformPostId },
      data: {
        status: 'failed',
        errorMessage: errorMsg,
        attempts: job.attemptsMade
      }
    });

    console.error(`❌ Threads job failed: ${errorMsg}`);
    throw error;
  }
}
