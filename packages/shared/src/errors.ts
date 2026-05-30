export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public userMessage: string,
    public code: string
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class FFmpegError extends AppError {
  constructor(message: string, statusCode = 500, userMessage = "Video processing failed", code = "FFMPEG_ERROR") {
    super(message, statusCode, userMessage, code);
  }
}

export class StorageError extends AppError {
  constructor(message: string, statusCode = 500, userMessage = "Storage operation failed", code = "STORAGE_ERROR") {
    super(message, statusCode, userMessage, code);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, statusCode = 400, userMessage = "Validation failed", code = "VALIDATION_ERROR") {
    super(message, statusCode, userMessage, code);
  }
}

export class QuotaError extends AppError {
  constructor(message: string, statusCode = 429, userMessage = "Quota exceeded", code = "QUOTA_EXCEEDED") {
    super(message, statusCode, userMessage, code);
  }
}

export class AuthError extends AppError {
  constructor(message: string, statusCode = 401, userMessage = "Authentication failed", code = "AUTH_ERROR") {
    super(message, statusCode, userMessage, code);
  }
}
