import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/responseHandler.js';

/**
 * Recursively cleans an object by removing or rejecting keys that start with '$' or contain '.'
 */
function cleanNoSqlObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanNoSqlObject);
  }

  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    // Drop keys starting with $ (MongoDB query operators) or containing . (path traversal/nesting)
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    cleaned[key] = cleanNoSqlObject(obj[key]);
  }
  return cleaned;
}

export function sanitizeNoSql(req: Request, res: Response, next: NextFunction): void {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = cleanNoSqlObject(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = cleanNoSqlObject(req.query);
    }
    if (req.params && typeof req.params === 'object') {
      req.params = cleanNoSqlObject(req.params);
    }
    next();
  } catch (err: any) {
    sendError(res, 'طلب غير صالح أو يحتوي على رموز غير مسموح بها', 400, 'INVALID_INPUT_SYNTAX');
  }
}
