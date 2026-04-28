import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { PostsService } from './posts.service';
import { successResponse, errorResponse } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth';

const postsService = new PostsService();

// Validation schemas
const publishSchema = z.object({
  idea: z
    .string()
    .min(1, 'Idea required')
    .max(500, 'Idea must be 500 characters or less'),
  post_type: z.enum([
    'announcement',
    'thread',
    'story',
    'promotional',
    'educational',
    'opinion'
  ]),
  platforms: z
    .array(z.enum(['twitter', 'linkedin', 'instagram', 'threads']))
    .min(1, 'At least one platform required')
    .max(4, 'Maximum 4 platforms allowed'),
  tone: z.enum([
    'professional',
    'casual',
    'witty',
    'authoritative',
    'friendly'
  ]),
  language: z.string().length(2).default('en'),
  model: z.enum(['gemini', 'openai', 'anthropic'])
});

const scheduleSchema = publishSchema.extend({
  publish_at: z.string().datetime('Invalid ISO datetime format')
});

const getPostsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.string().optional(),
  platform: z.string().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional()
});

export class PostsController {
  async publishPost(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('Unauthorized', 401));
      }

      const data = publishSchema.parse(req.body);
      const result = await postsService.publishPost(userId, data);

      res.status(201).json(successResponse(result));
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

  async schedulePost(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('Unauthorized', 401));
      }

      const data = scheduleSchema.parse(req.body);
      const result = await postsService.schedulePost(userId, {
        ...data,
        publish_at: new Date(data.publish_at)
      });

      res.status(201).json(successResponse(result));
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

  async getPosts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('Unauthorized', 401));
      }

      const filters = getPostsSchema.parse(req.query);
      const dateRange =
        filters.date_from && filters.date_to
          ? {
              from: new Date(filters.date_from),
              to: new Date(filters.date_to)
            }
          : undefined;

      const result = await postsService.getPosts(userId, {
        page: filters.page,
        limit: filters.limit,
        status: filters.status,
        platform: filters.platform,
        date_range: dateRange
      });

      res.status(200).json(
        successResponse({
          posts: result.posts,
          meta: result.pagination
        })
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json(errorResponse(error.errors[0].message, 400));
      }
      next(error);
    }
  }

  async getPost(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('Unauthorized', 401));
      }

      const postId = req.params.id as string;
      const post = await postsService.getPost(userId, postId);

      res.status(200).json(successResponse({ post }));
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Post not found') {
          return res.status(404).json(errorResponse(error.message, 404));
        }
        if (error.message === 'Unauthorized') {
          return res.status(403).json(errorResponse(error.message, 403));
        }
        return res.status(400).json(errorResponse(error.message, 400));
      }
      next(error);
    }
  }

  async retryPost(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('Unauthorized', 401));
      }

      const postId = req.params.id as string;
      const result = await postsService.retryPost(userId, postId);

      res.status(200).json(successResponse(result));
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Post not found') {
          return res.status(404).json(errorResponse(error.message, 404));
        }
        return res.status(400).json(errorResponse(error.message, 400));
      }
      next(error);
    }
  }

  async cancelPost(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('Unauthorized', 401));
      }

      const postId = req.params.id as string;
      const result = await postsService.cancelPost(userId, postId);

      res.status(200).json(successResponse(result));
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Post not found') {
          return res.status(404).json(errorResponse(error.message, 404));
        }
        return res.status(400).json(errorResponse(error.message, 400));
      }
      next(error);
    }
  }
}
