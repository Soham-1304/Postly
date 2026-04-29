import { Job } from 'bullmq';
import { PublishJobData } from '../queue';
import { prisma } from '../../../config/db';
import { decrypt } from '../../../utils/crypto';

/**
 * LinkedIn job processor
 * Posts to LinkedIn using v2 ugcPosts API
 */
export async function processLinkedInJob(job: Job<PublishJobData>) {
  const { platformPostId, content, userId } = job.data;

  try {
    // Update status to processing
    await prisma.platformPost.update({
      where: { id: platformPostId },
      data: { status: 'processing' }
    });

    // 1. Get credentials (prefer DB, fallback to .env for testing)
    let accessToken: string;
    let personUrn: string;

    const socialAccount = await prisma.socialAccount.findFirst({
      where: { userId, platform: 'linkedin' }
    });

    if (socialAccount && socialAccount.accessTokenEnc) {
      accessToken = decrypt(socialAccount.accessTokenEnc);
      personUrn = socialAccount.handle; // Assuming handle stores the URN
    } else if (process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_PERSON_URN) {
      accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
      personUrn = process.env.LINKEDIN_PERSON_URN;
      console.log('⚠️ Falling back to LinkedIn credentials from .env');
    } else {
      throw new Error('No LinkedIn account connected for this user and no .env fallback found');
    }

    // 2. Post to LinkedIn using ugcPosts API
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        author: personUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`LinkedIn API error: ${response.status} ${response.statusText} - ${errorData}`);
    }

    const responseData = await response.json();

    // 3. Update DB on success
    await prisma.platformPost.update({
      where: { id: platformPostId },
      data: {
        status: 'published',
        publishedAt: new Date(),
        attempts: job.attemptsMade
      }
    });

    console.log(`✅ LinkedIn: Successfully posted. ID: ${responseData.id}`);
    return { success: true, postId: responseData.id };
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
