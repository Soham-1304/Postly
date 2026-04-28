import type { NextFunction, Request, Response } from "express";
import { sendError } from "../utils/response";
import { verifyAccessToken } from "../utils/jwt";

export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email?: string;
  };
};

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader) {
      return sendError(res, "Missing authorization header", 401);
    }

    // Extract Bearer token
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return sendError(res, "Invalid authorization header format", 401);
    }

    const token = parts[1];

    // Verify token
    try {
      const payload = verifyAccessToken(token);
      req.user = {
        id: payload.id,
        email: payload.email,
      };
      next();
    } catch (jwtError) {
      return sendError(res, "Invalid or expired token", 401);
    }
  } catch (error) {
    return sendError(res, "Authentication failed", 401);
  }
}
