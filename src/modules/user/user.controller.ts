import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserService } from './user.service';
import { successResponse, errorResponse } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth';

const userService = new UserService();

// Validation schemas
const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  defaultTone: z
    .enum(['professional', 'casual', 'technical', 'creative'])
    .optional(),
  defaultLanguage: z.string().length(2).optional(), // e.g., 'en', 'fr', 'es'
});

const addSocialAccountSchema = z.object({
  platform: z.enum(['twitter', 'linkedin', 'instagram', 'threads']),
  accessToken: z.string().min(1, 'Access token required'),
  refreshToken: z.string().optional(),
  handle: z.string().min(1).max(100, 'Handle must be less than 100 characters'),
});

const updateAiKeysSchema = z
  .object({
    openaiKey: z.string().optional(),
    anthropicKey: z.string().optional(),
  })
  .refine((data) => data.openaiKey || data.anthropicKey, {
    message: 'At least one API key must be provided',
  });

export class UserController {
  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('Unauthorized', 401));
      }

      const user = await userService.getProfile(userId);
      res.status(200).json(successResponse({ user }));
    } catch (error) {
      if (error instanceof Error) {
        return res.status(404).json(errorResponse(error.message, 404));
      }
      next(error);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('Unauthorized', 401));
      }

      const data = updateProfileSchema.parse(req.body);
      const user = await userService.updateProfile(userId, data);
      res.status(200).json(successResponse({ user }));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json(errorResponse(error.errors[0].message, 400));
      }
      if (error instanceof Error) {
        return res.status(400).json(errorResponse(error.message, 400));
      }
      next(error);
    }
  }

  async addSocialAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('Unauthorized', 401));
      }

      const data = addSocialAccountSchema.parse(req.body);
      const account = await userService.addSocialAccount(
        userId,
        data.platform,
        data.accessToken,
        data.handle,
        data.refreshToken
      );

      res.status(201).json(
        successResponse({
          account: {
            id: account.id,
            platform: account.platform,
            handle: account.handle,
            connectedAt: account.connectedAt,
          },
        })
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json(errorResponse(error.errors[0].message, 400));
      }
      if (error instanceof Error) {
        return res.status(400).json(errorResponse(error.message, 400));
      }
      next(error);
    }
  }

  async getSocialAccounts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('Unauthorized', 401));
      }

      const accounts = await userService.getSocialAccounts(userId);
      res.status(200).json(successResponse({ accounts }));
    } catch (error) {
      next(error);
    }
  }

  async deleteSocialAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('Unauthorized', 401));
      }

      const id = req.params.id as string;
      await userService.deleteSocialAccount(userId, id);
      res.status(200).json(successResponse({}));
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Social account not found') {
          return res.status(404).json(errorResponse(error.message, 404));
        }
        if (error.message.includes('Unauthorized')) {
          return res.status(403).json(errorResponse(error.message, 403));
        }
        return res.status(400).json(errorResponse(error.message, 400));
      }
      next(error);
    }
  }

  async updateAiKeys(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('Unauthorized', 401));
      }

      const data = updateAiKeysSchema.parse(req.body);
      const keys = await userService.updateAiKeys(
        userId,
        data.openaiKey,
        data.anthropicKey
      );

      res.status(200).json(
        successResponse({
          keys: {
            id: keys.id,
            hasOpenaiKey: keys.hasOpenaiKey,
            hasAnthropicKey: keys.hasAnthropicKey,
            updatedAt: keys.updatedAt,
          },
        })
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json(errorResponse(error.errors[0].message, 400));
      }
      if (error instanceof Error) {
        return res.status(400).json(errorResponse(error.message, 400));
      }
      next(error);
    }
  }
}
