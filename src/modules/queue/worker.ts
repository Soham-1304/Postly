import { Worker } from 'bullmq';
import { redis } from '../../config/redis';
import Redis from 'ioredis';
import { env } from '../../config/env';
import { PublishJobData } from './queue';
import { processTwitterJob } from './jobs/twitter.job';
import { processLinkedInJob } from './jobs/linkedin.job';
import { processInstagramJob } from './jobs/instagram.job';
import { processThreadsJob } from './jobs/threads.job';

/**
 * BullMQ Worker - listens on platform-publish queue
 * Routes jobs to platform-specific processors
 * Retries on failure with exponential backoff
 */
export const publishWorker = new Worker<PublishJobData>(
  'platform-publish',
  async (job) => {
    console.log(`🔄 Processing job ${job.id}: ${job.data.platform}`);

    // Route to platform-specific processor
    switch (job.data.platform) {
      case 'twitter':
        return await processTwitterJob(job);
      case 'linkedin':
        return await processLinkedInJob(job);
      case 'instagram':
        return await processInstagramJob(job);
      case 'threads':
        return await processThreadsJob(job);
      default:
        throw new Error(`Unknown platform: ${job.data.platform}`);
    }
  },
  {
    connection: new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }),
    concurrency: 5  // Process 5 jobs in parallel
  }
);

// Event handlers
publishWorker.on('failed', (job, err) => {
  console.error(
    `❌ Worker: Job ${job?.id} failed on attempt ${job?.attemptsMade}: ${err.message}`
  );
});

publishWorker.on('completed', (job) => {
  console.log(`✅ Worker: Job ${job.id} completed successfully`);
});

publishWorker.on('error', (err) => {
  console.error('❌ Worker error:', err.message);
});

export default publishWorker;
