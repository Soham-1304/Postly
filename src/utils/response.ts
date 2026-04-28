import type { Response } from "express";

type Meta = Record<string, unknown> | null;

export function sendSuccess<T>(res: Response, data: T, meta: Meta = null, statusCode = 200) {
  return res.status(statusCode).json({
    data,
    meta,
    error: null
  });
}

export function sendError(res: Response, message: string, code = 500, details?: unknown) {
  return res.status(code).json({
    data: null,
    meta: null,
    error: {
      message,
      code,
      details
    }
  });
}
