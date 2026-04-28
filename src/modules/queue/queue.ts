import { Queue } from 'bullmq';
import { redis } from '../../config/redis';

/**
 * Job data type for publishing to platforms
 */
export interface PublishJobData {
  postId: string;
  platformPostId: string;
  platform: 'twitter' | 'linkedin' | 'instagram' | 'threads';
  content: string;
  userId: string;
  attempts: number;
}

/**
 * BullMQ queue for platform publishing
 * One job per platform per post (not monolithic)
 * Retry: 3 attempts with exponential backoff (1s → 5s → 25s)
 */
export const publishQueue = new Queue<PublishJobData>('platform-publish', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000  // 1s, then 5s (1000 * 5), then 25s (1000 * 25)
    },
    removeOnComplete: true,
    removeOnFail: false  // Keep failed jobs for inspection
  }
});

// Event handlers
(publishQueue as any).on('completed', (job: any) => {
  console.log(`✅ Job completed: ${job.id} (${job.data.platform})`);
});

(publishQueue as any).on('failed', (job: any, err: any) => {
  console.error(
    `❌ Job failed: ${job?.id} (${job?.data.platform}) - ${err.message}`
  );
});

publishQueue.on('error', (err) => {
  console.error('❌ Queue error:', err.message);
});

export default publishQueue;
