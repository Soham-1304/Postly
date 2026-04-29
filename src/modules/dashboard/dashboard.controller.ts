import { Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service';
import { successResponse, errorResponse } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth';

const dashboardService = new DashboardService();

export class DashboardController {
  async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('Unauthorized', 401));
      }

      const stats = await dashboardService.getStats(userId);
      res.status(200).json(successResponse(stats));
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json(errorResponse(error.message, 500));
      }
      next(error);
    }
  }
}
