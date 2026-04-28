import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { successResponse, errorResponse } from '../../utils/response';

const authService = new AuthService();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
});

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = registerSchema.parse(req.body);
      const result = await authService.register(data.email, data.password, data.name);
      res.status(201).json(successResponse(result));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(errorResponse(error.errors[0].message, 400));
      }
      if (error instanceof Error) {
        return res.status(400).json(errorResponse(error.message, 400));
      }
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = loginSchema.parse(req.body);
      const result = await authService.login(data.email, data.password);
      res.status(200).json(successResponse(result));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(errorResponse(error.errors[0].message, 400));
      }
      if (error instanceof Error) {
        return res.status(401).json(errorResponse(error.message, 401));
      }
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const data = refreshSchema.parse(req.body);
      const result = await authService.refresh(data.refreshToken);
      res.status(200).json(successResponse(result));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(errorResponse(error.errors[0].message, 400));
      }
      if (error instanceof Error) {
        return res.status(401).json(errorResponse(error.message, 401));
      }
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const data = logoutSchema.parse(req.body);
      await authService.logout(data.refreshToken);
      res.status(200).json(successResponse({}));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(errorResponse(error.errors[0].message, 400));
      }
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('Unauthorized', 401));
      }
      const user = await authService.getMe(userId);
      res.status(200).json(successResponse({ user }));
    } catch (error) {
      if (error instanceof Error) {
        return res.status(404).json(errorResponse(error.message, 404));
      }
      next(error);
    }
  }
}
