import { Request, Response, NextFunction } from 'express';
import { verifyCustomerToken, verifyAdminToken, CustomerTokenPayload } from '../utils/jwt.js';
import { sendError } from '../utils/responseHandler.js';
import { User, IUser } from '../models/User.js';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  customer?: CustomerTokenPayload;
}

export async function authenticateCustomer(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'يرجى تسجيل الدخول للوصول إلى هذه الخدمة', 401, 'UNAUTHORIZED');
    return;
  }

  const token = authHeader.split(' ')[1];



  try {
    let decoded: any;
    try {
      decoded = verifyCustomerToken(token);
    } catch (custErr: any) {
      // Check if this is an authorized admin/staff token accessing customer data
      try {
        const adminDecoded = verifyAdminToken(token);
        if (adminDecoded && adminDecoded.type === 'admin') {
          return next();
        }
      } catch {}
      throw custErr;
    }

    if (!decoded || decoded.type !== 'customer') {
      sendError(res, 'رمز الجلسة غير صالح أو منتهي الصلاحية', 401, 'INVALID_TOKEN');
      return;
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      sendError(res, 'المستخدم غير موجود', 401, 'USER_NOT_FOUND');
      return;
    }

    if (user.status === 'deleted' || user.status === 'disabled' || user.isDeleted) {
      sendError(res, 'تم حذف وتعطيل هذا الحساب نهائياً من قِبل إدارة كلينزو. تم حظر الدخول.', 403, 'ACCOUNT_DELETED');
      return;
    }

    if (user.status === 'suspended' || user.status === 'inactive') {
      sendError(res, 'تم تعطيل هذا الحساب، يرجى التواصل مع إدارة كلينزو', 403, 'ACCOUNT_DEACTIVATED');
      return;
    }

    req.user = user;
    req.customer = decoded;
    next();
  } catch (err: any) {
    const isExpired = err?.name === 'TokenExpiredError';
    sendError(
      res,
      isExpired ? 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً' : 'رمز الجلسة غير صالح أو منتهي الصلاحية',
      401,
      isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
    );
  }
}


export async function optionalCustomerAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyCustomerToken(token);
    if (decoded && decoded.type === 'customer') {
      const user = await User.findById(decoded.id);
      if (user && user.status !== 'suspended') {
        req.user = user;
        req.customer = decoded;
      }
    }
  } catch {}
  next();
}
