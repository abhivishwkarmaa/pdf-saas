import { Request, Response, NextFunction } from "express";
import { AppError } from "@pdf-saas/shared";

/**
 * Wrapper to catch async errors and pass them to the Express error handler
 */
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Global application error handler middleware
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let userMessage = err.userMessage || "An unexpected error occurred.";
  let code = err.code || "INTERNAL_SERVER_ERROR";

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    userMessage = err.userMessage;
    code = err.code;
  }

  console.error("API Error:", {
    path: req.path,
    method: req.method,
    error: message,
    stack: err.stack,
  });

  res.status(statusCode).json({
    success: false,
    code,
    error: userMessage || message,
    message: userMessage,
    developerMessage: message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};
