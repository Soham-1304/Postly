import { prisma } from '../../config/db';
import { encrypt, decrypt } from '../../utils/crypto';

export class UserService {
  /**
   * Get user profile by ID
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        defaultTone: true,
        defaultLanguage: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Update user profile (name, bio, defaultTone, defaultLanguage)
   */
  async updateProfile(
    userId: string,
    data: {
      name?: string;
      bio?: string;
      defaultTone?: string;
      defaultLanguage?: string;
    }
  ) {
    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.bio !== undefined) {
      updateData.bio = data.bio;
    }
    if (data.defaultTone !== undefined) {
      updateData.defaultTone = data.defaultTone;
    }
    if (data.defaultLanguage !== undefined) {
      updateData.defaultLanguage = data.defaultLanguage;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        defaultTone: true,
        defaultLanguage: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Add a social account (encrypt tokens before storing)
   */
  async addSocialAccount(
    userId: string,
    platform: string,
    accessToken: string,
    handle: string,
    refreshToken?: string
  ) {
    // Encrypt tokens
    const accessTokenEnc = encrypt(accessToken);
    const refreshTokenEnc = refreshToken ? encrypt(refreshToken) : undefined;

    // Create social account
    const socialAccount = await prisma.socialAccount.create({
      data: {
        userId,
        platform,
        accessTokenEnc,
        refreshTokenEnc,
        handle,
      },
    });

    return socialAccount;
  }

  /**
   * Get all social accounts for a user (tokens remain encrypted)
   */
  async getSocialAccounts(userId: string) {
    const accounts = await prisma.socialAccount.findMany({
      where: { userId },
      select: {
        id: true,
        platform: true,
        handle: true,
        connectedAt: true,
        // Note: accessTokenEnc and refreshTokenEnc stay encrypted in DB
        // We don't select them to avoid exposing encrypted data unnecessarily
      },
    });

    return accounts;
  }

  /**
   * Delete a social account (verify ownership first)
   */
  async deleteSocialAccount(userId: string, accountId: string): Promise<void> {
    // Verify account belongs to user
    const account = await prisma.socialAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('Social account not found');
    }

    if (account.userId !== userId) {
      throw new Error('Unauthorized: account does not belong to user');
    }

    // Delete
    await prisma.socialAccount.delete({
      where: { id: accountId },
    });
  }

  /**
   * Update or create AI keys (encrypt before storing)
   */
  async updateAiKeys(
    userId: string,
    openaiKey?: string,
    anthropicKey?: string
  ) {
    // Encrypt keys if provided
    const openaiKeyEnc = openaiKey ? encrypt(openaiKey) : undefined;
    const anthropicKeyEnc = anthropicKey ? encrypt(anthropicKey) : undefined;

    // Check if AiKeys record exists
    const existing = await prisma.aiKeys.findUnique({
      where: { userId },
    });

    let aiKeys;

    if (existing) {
      // Update existing
      aiKeys = await prisma.aiKeys.update({
        where: { userId },
        data: {
          ...(openaiKeyEnc && { openaiKeyEnc }),
          ...(anthropicKeyEnc && { anthropicKeyEnc }),
        },
      });
    } else {
      // Create new
      aiKeys = await prisma.aiKeys.create({
        data: {
          userId,
          openaiKeyEnc,
          anthropicKeyEnc,
        },
      });
    }

    return {
      id: aiKeys.id,
      userId: aiKeys.userId,
      hasOpenaiKey: !!aiKeys.openaiKeyEnc,
      hasAnthropicKey: !!aiKeys.anthropicKeyEnc,
      updatedAt: aiKeys.updatedAt,
    };
  }
}
