import { Job } from 'bullmq';
import { PublishJobData } from '../queue';
import { prisma } from '../../../config/db';
import { decrypt } from '../../../utils/crypto';

/**
 * Twitter job processor - posts tweet using v2 API
 * Requires user's Twitter OAuth token from SocialAccount table
 */
export async function processTwitterJob(job: Job<PublishJobData>) {
  const { postId, platformPostId, content, userId } = job.data;

  try {
    // Update status to processing
    await prisma.platformPost.update({
      where: { id: platformPostId },
      data: { status: 'processing' }
    });

    // Get user's Twitter credentials
    const socialAccount = await prisma.socialAccount.findFirst({
      where: { userId, platform: 'twitter' }
    });

    if (!socialAccount || !socialAccount.accessTokenEnc) {
      throw new Error('No Twitter account connected for this user');
    }

    // Decrypt access token
    let accessToken: string;
    try {
      accessToken = decrypt(socialAccount.accessTokenEnc);
    } catch (err) {
      throw new Error('Failed to decrypt Twitter token');
    }

    // Initialize Twitter API client
    const { TwitterApi } = await import('twitter-api-v2');
    const client = new TwitterApi(accessToken);
    const rwClient = client.readWrite;

    // Post tweet
    const tweet = await rwClient.v2.tweet(content);

    // Update DB on success
    await prisma.platformPost.update({
      where: { id: platformPostId },
      data: {
        status: 'published',
        publishedAt: new Date(),
        attempts: job.attemptsMade
      }
    });

    console.log(`✅ Twitter: Posted tweet ${tweet.data.id}`);
    return { success: true, tweetId: tweet.data.id };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    // Update DB on failure
    await prisma.platformPost.update({
      where: { id: platformPostId },
      data: {
        status: 'failed',
        errorMessage: errorMsg,
        attempts: job.attemptsMade
      }
    });

    console.error(`❌ Twitter job failed: ${errorMsg}`);
    throw error;  // Let BullMQ handle retry
  }
}
