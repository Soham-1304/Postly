import { Job } from 'bullmq';
import { PublishJobData } from '../queue';
import { prisma } from '../../../config/db';

/**
 * LinkedIn job processor (stub)
 * Logs what would happen; actual LinkedIn API implementation is bonus
 */
export async function processLinkedInJob(job: Job<PublishJobData>) {
  const { platformPostId, content, userId } = job.data;

  try {
    // Update status to processing
    await prisma.platformPost.update({
      where: { id: platformPostId },
      data: { status: 'processing' }
    });

    // STUB: Log what would happen
    console.log(`📌 [STUB] LinkedIn: Would post for user ${userId}`);
    console.log(`Content preview: ${content.substring(0, 80)}...`);

    // Simulate processing delay
    await new Promise((r) => setTimeout(r, 500));

    // Update DB on success
    await prisma.platformPost.update({
      where: { id: platformPostId },
      data: {
        status: 'published',
        publishedAt: new Date(),
        attempts: job.attemptsMade
      }
    });

    console.log(`✅ LinkedIn: Successfully posted (stub)`);
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

    console.error(`❌ LinkedIn job failed: ${errorMsg}`);
    throw error;
  }
}
