import type { ErrorRequestHandler } from "express";
import { sendError } from "../utils/response";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const message = error instanceof Error ? error.message : "Internal server error";
  const code = typeof error?.statusCode === "number" ? error.statusCode : 500;

  if (process.env.NODE_ENV !== "test") {
    console.error(error);
  }

  sendError(res, message, code);
};
