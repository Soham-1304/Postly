import { Router } from 'express';
import { PostsController } from './posts.controller';
import { requireAuth } from '../../middleware/auth';

const postsController = new PostsController();
export const postsRouter = Router();

// All routes protected with JWT auth
postsRouter.post('/publish', requireAuth, (req, res, next) =>
  postsController.publishPost(req, res, next)
);

postsRouter.post('/schedule', requireAuth, (req, res, next) =>
  postsController.schedulePost(req, res, next)
);

postsRouter.get('/', requireAuth, (req, res, next) =>
  postsController.getPosts(req, res, next)
);

postsRouter.get('/:id', requireAuth, (req, res, next) =>
  postsController.getPost(req, res, next)
);

postsRouter.post('/:id/retry', requireAuth, (req, res, next) =>
  postsController.retryPost(req, res, next)
);

postsRouter.delete('/:id', requireAuth, (req, res, next) =>
  postsController.cancelPost(req, res, next)
);
