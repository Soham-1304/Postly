import { Router } from 'express';
import { ContentController } from './content.controller';
import { requireAuth } from '../../middleware/auth';

const contentController = new ContentController();
export const contentRouter = Router();

// POST /api/content/generate (protected)
contentRouter.post('/generate', requireAuth, (req, res, next) =>
  contentController.generateContent(req, res, next)
);
