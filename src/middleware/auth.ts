import type { NextFunction, Request, Response } from "express";
import { sendError } from "../utils/response";

export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email?: string;
  };
};

export function requireAuth(_req: AuthenticatedRequest, res: Response, _next: NextFunction) {
  return sendError(res, "Authentication middleware is scaffolded but not implemented yet", 501);
}
