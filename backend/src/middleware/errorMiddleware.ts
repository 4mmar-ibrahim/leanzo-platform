import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env.js';
import { sendError } from '../utils/responseHandler.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(`[API Error] ${req.method} ${req.path}`, ENV.IS_PRODUCTION ? err.code || err.name : err);

  const statusCode = err.statusCode || 500;
  if (ENV.IS_PRODUCTION && statusCode >= 500) {
    sendError(res, '', statusCode);
    return;
  }
  const message = err.message || 'حدث خطأ غير متوقع في الخادم، يرجى المحاولة لاحقاً';
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  res.status(statusCode).json({
    success: false,
    message,
    code,
    errors: err.errors,
    stack: ENV.IS_PRODUCTION ? undefined : err.stack,
  });
}
