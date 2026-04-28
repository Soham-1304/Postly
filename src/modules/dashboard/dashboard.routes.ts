import { Router } from "express";
import { sendError } from "../../utils/response";

export const dashboardRouter = Router();

dashboardRouter.get("/stats", (_req, res) => sendError(res, "Dashboard stats endpoint scaffolded", 501));
