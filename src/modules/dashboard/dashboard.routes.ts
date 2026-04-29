import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { DashboardController } from "./dashboard.controller";

const controller = new DashboardController();
export const dashboardRouter = Router();

dashboardRouter.get("/stats", requireAuth, (req, res, next) =>
  controller.getStats(req, res, next)
);
