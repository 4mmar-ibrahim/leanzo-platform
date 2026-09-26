import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  code?: string;
  errors?: any;
}

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode = 200): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendError(res: Response, message: string, statusCode = 400, code?: string, errors?: any): Response {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
    errors,
  });
}
