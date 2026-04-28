import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { ContentService } from './content.service';
import { successResponse, errorResponse } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth';

const contentService = new ContentService();

// Validation schema
const generateContentSchema = z.object({
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

export class ContentController {
  async generateContent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('Unauthorized', 401));
      }

      // Validate input
      const data = generateContentSchema.parse(req.body);

      // Call service
      const result = await contentService.generateContent({
        ...data,
        userId
      });

      // Return success
      res.status(200).json(successResponse(result));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json(errorResponse(error.errors[0].message, 400));
      }
      if (error instanceof Error) {
        // Check if it's a service error (user doesn't have API key, etc.)
        if (error.message.includes('not configured')) {
          return res.status(400).json(errorResponse(error.message, 400));
        }
        // Check if it's an AI service error
        if (
          error.message.includes('API error') ||
          error.message.includes('Failed to parse')
        ) {
          return res.status(502).json(errorResponse(error.message, 502));
        }
        // Validation errors from service (char limits, hashtag counts)
        if (
          error.message.includes('exceeds') ||
          error.message.includes('out of range')
        ) {
          return res.status(400).json(errorResponse(error.message, 400));
        }
        return res.status(400).json(errorResponse(error.message, 400));
      }
      next(error);
    }
  }
}
