import { Request, Response } from 'express';
import { User, IUser } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import {
  generateCustomerToken,
  generateCustomerRefreshToken,
  verifyCustomerRefreshToken,
} from '../utils/jwt.js';
import {
  setRefreshCookie,
  clearRefreshCookie,
  getCookieFromRequest,
  COOKIE_NAMES,
} from '../utils/cookies.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import {
  validateEgyptianPhone,
  CANONICAL_PHONE_ERROR_MESSAGE,
  CANONICAL_PHONE_ERROR_CODE,
} from '../utils/phoneValidator.js';

export async function registerCustomer(req: Request, res: Response): Promise<void> {
  try {
    const { name, phone, password, email } = req.body;

    if (!name || !phone || !password || typeof name !== 'string' || typeof phone !== 'string' || typeof password !== 'string') {
      sendError(res, 'يرجى إدخال الاسم ورقم الهاتف وكلمة المرور بشكل صحيح', 422, 'MISSING_FIELDS');
      return;
    }

    if (password.length < 6) {
      sendError(res, 'كلمة المرور يجب أن تتكون من 6 خانات على الأقل', 422, 'PASSWORD_TOO_SHORT');
      return;
    }

    const cleanPhone = phone.trim();

    // Strict Egyptian Phone Validation
    const phoneVal = validateEgyptianPhone(cleanPhone);
    if (!phoneVal.isValid) {
      sendError(
        res,
        phoneVal.message || CANONICAL_PHONE_ERROR_MESSAGE,
        400,
        phoneVal.code || CANONICAL_PHONE_ERROR_CODE
      );
      return;
    }

    // Check duplicate phone
    const existing = await User.findOne({ phone: cleanPhone });
    if (existing) {
      if (existing.status === 'deleted' || existing.status === 'disabled' || existing.isDeleted) {
        sendError(
          res,
          'بيانات هذا الحساب (رقم الهاتف) محظورة ومحذوفة مسبقاً من قِبل الإدارة. لا يمكن إنشاء حساب جديد بهذه البيانات.',
          409,
          'ACCOUNT_BANNED_OR_DELETED'
        );
        return;
      }
      sendError(res, 'رقم الهاتف مسجل بالفعل مسبقاً لحساب آخر، يرجى تسجيل الدخول أو استخدام رقم مختلف', 409, 'PHONE_ALREADY_EXISTS');
      return;
    }

    // Check duplicate email if provided
    if (email && typeof email === 'string' && email.trim()) {
      const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
      if (existingEmail) {
        if (existingEmail.status === 'deleted' || existingEmail.status === 'disabled' || existingEmail.isDeleted) {
          sendError(
            res,
            'البريد الإلكتروني المدخل محظور ومحذوف مسبقاً من قِبل الإدارة.',
            409,
            'ACCOUNT_BANNED_OR_DELETED'
          );
          return;
        }
        sendError(res, 'البريد الإلكتروني مسجل بالفعل لحساب آخر', 409, 'EMAIL_ALREADY_EXISTS');
        return;
      }
    }

    const newUser = await User.create({
      name: name.trim(),
      phone: cleanPhone,
      password,
      email: email ? email.trim() : undefined,
      addresses: [],
    });

    // Automatic Notifications for Customer Registration
    try {
      await Notification.create({
        target: 'admin',
        title: 'عميل جديد مسجل',
        titleEn: 'New Customer Registered',
        message: `انضم عميل جديد إلى المنصة: ${newUser.name} (${newUser.phone})`,
        messageEn: `New customer registered: ${newUser.name}`,
        type: 'customer',
        read: false,
        link: '/admin/customers',
      });

      await Notification.create({
        target: 'customer',
        userId: newUser._id.toString(),
        title: '🎉 أهلاً بك في كلينزو!',
        titleEn: 'Welcome to Cleanzo!',
        message: `مرحباً بك يا ${newUser.name}! نسعد بانضمامك لعائلة كلينزو لخدمات العناية المتكاملة.`,
        messageEn: `Welcome ${newUser.name} to Cleanzo!`,
        type: 'info',
        read: false,
        link: '/',
      });
    } catch (notifErr) {
      console.warn('Non-critical: Customer registration notification error:', notifErr);
    }

    const token = generateCustomerToken({
      id: newUser._id.toString(),
      phone: newUser.phone,
    });

    const refreshToken = generateCustomerRefreshToken({
      id: newUser._id.toString(),
      phone: newUser.phone,
    });

    setRefreshCookie(req, res, COOKIE_NAMES.CUSTOMER_REFRESH, refreshToken);

    sendSuccess(
      res,
      {
        user: {
          id: newUser._id.toString(),
          name: newUser.name,
          phone: newUser.phone,
          email: newUser.email,
          avatar: newUser.avatar,
          addresses: newUser.addresses,
          createdAt: newUser.createdAt,
        },
        token,
      },
      'تم إنشاء الحساب بنجاح، مرحباً بك في كلينزو!',
      201
    );
  } catch (err: any) {
    sendError(res, err.message || 'فشل إنشاء الحساب', 500);
  }
}

export async function loginCustomer(req: Request, res: Response): Promise<void> {
  try {
    const { phone, password } = req.body;

    if (!phone || !password || typeof phone !== 'string' || typeof password !== 'string') {
      sendError(res, 'يرجى إدخال رقم الهاتف وكلمة المرور بشكل صحيح', 422, 'MISSING_CREDENTIALS');
      return;
    }

    const cleanPhone = phone.trim();

    // Strict Egyptian Phone Validation
    const phoneVal = validateEgyptianPhone(cleanPhone);
    if (!phoneVal.isValid) {
      sendError(
        res,
        phoneVal.message || CANONICAL_PHONE_ERROR_MESSAGE,
        400,
        phoneVal.code || CANONICAL_PHONE_ERROR_CODE
      );
      return;
    }

    const user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      sendError(res, 'رقم الهاتف أو كلمة المرور غير صحيحة', 401, 'INVALID_CREDENTIALS');
      return;
    }

    if (user.status === 'deleted' || user.status === 'disabled' || user.isDeleted) {
      sendError(res, 'هذا الحساب محذوف ومعطل نهائياً من قِبل إدارة كلينزو. تم حظر الدخول.', 403, 'ACCOUNT_DELETED');
      return;
    }

    if (user.status === 'suspended' || user.status === 'inactive') {
      sendError(res, 'هذا الحساب معطل، يرجى التواصل مع إدارة كلينزو', 403, 'ACCOUNT_DEACTIVATED');
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      sendError(res, 'رقم الهاتف أو كلمة المرور غير صحيحة', 401, 'INVALID_CREDENTIALS');
      return;
    }

    const token = generateCustomerToken({
      id: user._id.toString(),
      phone: user.phone,
    });

    const refreshToken = generateCustomerRefreshToken({
      id: user._id.toString(),
      phone: user.phone,
    });

    setRefreshCookie(req, res, COOKIE_NAMES.CUSTOMER_REFRESH, refreshToken);

    sendSuccess(
      res,
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          phone: user.phone,
          email: user.email,
          avatar: user.avatar,
          addresses: user.addresses,
          createdAt: user.createdAt,
        },
        token,
      },
      'تم تسجيل الدخول بنجاح'
    );
  } catch (err: any) {
    sendError(res, err.message || 'فشل تسجيل الدخول', 500);
  }
}

export async function refreshTokenCustomer(req: Request, res: Response): Promise<void> {
  try {
    let refreshToken = getCookieFromRequest(req, COOKIE_NAMES.CUSTOMER_REFRESH);

    if (!refreshToken && req.body?.refreshToken) {
      refreshToken = req.body.refreshToken;
    }

    if (!refreshToken) {
      sendError(res, 'جلسة التحديث غير موجودة أو منتهية الصلاحية', 401, 'MISSING_REFRESH_TOKEN');
      return;
    }

    let decoded: any;
    try {
      decoded = verifyCustomerRefreshToken(refreshToken);
    } catch (err: any) {
      clearRefreshCookie(req, res, COOKIE_NAMES.CUSTOMER_REFRESH);
      sendError(res, 'رمز تحديث الجلسة غير صالح أو منتهي الصلاحية', 401, 'INVALID_REFRESH_TOKEN');
      return;
    }

    if (!decoded || decoded.type !== 'customer_refresh' || !decoded.id) {
      clearRefreshCookie(req, res, COOKIE_NAMES.CUSTOMER_REFRESH);
      sendError(res, 'رمز التحديث غير صالح', 401, 'INVALID_TOKEN_TYPE');
      return;
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      clearRefreshCookie(req, res, COOKIE_NAMES.CUSTOMER_REFRESH);
      sendError(res, 'حساب العميل غير موجود', 401, 'USER_NOT_FOUND');
      return;
    }

    if (user.status === 'deleted' || user.status === 'disabled' || user.isDeleted) {
      clearRefreshCookie(req, res, COOKIE_NAMES.CUSTOMER_REFRESH);
      sendError(res, 'تم حذف هذا الحساب نهائياً من قِبل الإدارة', 403, 'ACCOUNT_DELETED');
      return;
    }

    if (user.status === 'suspended' || user.status === 'inactive') {
      clearRefreshCookie(req, res, COOKIE_NAMES.CUSTOMER_REFRESH);
      sendError(res, 'هذا الحساب معطل حالياً', 403, 'ACCOUNT_DEACTIVATED');
      return;
    }

    // Issue fresh access token
    const newAccessToken = generateCustomerToken({
      id: user._id.toString(),
      phone: user.phone,
    });

    // Roll refresh token for continuous persistent session
    const newRefreshToken = generateCustomerRefreshToken({
      id: user._id.toString(),
      phone: user.phone,
    });
    setRefreshCookie(req, res, COOKIE_NAMES.CUSTOMER_REFRESH, newRefreshToken);

    sendSuccess(res, {
      token: newAccessToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        phone: user.phone,
        email: user.email,
        avatar: user.avatar,
        addresses: user.addresses,
        createdAt: user.createdAt,
      },
    }, 'تم تجديد الجلسة بنجاح');
  } catch (err: any) {
    sendError(res, err.message || 'فشل تجديد الجلسة', 500);
  }
}

export async function logoutCustomer(req: Request, res: Response): Promise<void> {
  try {
    clearRefreshCookie(req, res, COOKIE_NAMES.CUSTOMER_REFRESH);
    sendSuccess(res, null, 'تم تسجيل الخروج بنجاح');
  } catch (err: any) {
    sendError(res, err.message || 'فشل تسجيل الخروج', 500);
  }
}

export async function getCustomerProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    sendError(res, 'غير مصرح', 401);
    return;
  }

  sendSuccess(res, {
    id: req.user._id.toString(),
    name: req.user.name,
    phone: req.user.phone,
    email: req.user.email,
    avatar: req.user.avatar,
    addresses: req.user.addresses,
    status: req.user.status,
    totalSpent: req.user.totalSpent,
    ordersCount: req.user.ordersCount,
    createdAt: req.user.createdAt,
  });
}

export async function updateCustomerProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    sendError(res, 'غير مصرح', 401);
    return;
  }

  const { name, email, avatar, phone } = req.body;
  if (name) req.user.name = name.trim();
  if (email !== undefined) req.user.email = email ? email.trim() : undefined;
  if (avatar) req.user.avatar = avatar;

  if (phone !== undefined) {
    const cleanPhone = String(phone).trim();
    const phoneVal = validateEgyptianPhone(cleanPhone);
    if (!phoneVal.isValid) {
      sendError(
        res,
        phoneVal.message || CANONICAL_PHONE_ERROR_MESSAGE,
        400,
        phoneVal.code || CANONICAL_PHONE_ERROR_CODE
      );
      return;
    }

    if (cleanPhone !== req.user.phone) {
      const existing = await User.findOne({ phone: cleanPhone });
      if (existing && String(existing._id || existing.id) !== String(req.user._id || req.user.id)) {
        sendError(res, 'رقم الهاتف مسجل بالفعل مسبقاً لحساب آخر', 409, 'PHONE_ALREADY_EXISTS');
        return;
      }
      req.user.phone = cleanPhone;
    }
  }

  await req.user.save();

  sendSuccess(res, {
    id: req.user._id.toString(),
    name: req.user.name,
    phone: req.user.phone,
    email: req.user.email,
    avatar: req.user.avatar,
    addresses: req.user.addresses,
  }, 'تم تحديث الملف الشخصي بنجاح');
}

export async function addCustomerAddress(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    sendError(res, 'غير مصرح', 401);
    return;
  }

  const { label, governorate, city, area, building, floor, apartment, details, isDefault } = req.body;

  if (!governorate || !city || !area) {
    sendError(res, 'يرجى تحديد المحافظة والمدينة والمنطقة', 422, 'MISSING_ADDRESS_FIELDS');
    return;
  }

  if (isDefault) {
    req.user.addresses.forEach((addr) => (addr.isDefault = false));
  }

  req.user.addresses.push({
    label: label || 'المنزل',
    governorate,
    city,
    area,
    building,
    floor,
    apartment,
    details,
    isDefault: isDefault ?? (req.user.addresses.length === 0),
  });

  await req.user.save();

  sendSuccess(res, req.user.addresses, 'تمت إضافة العنوان بنجاح', 201);
}

export async function deleteCustomerAddress(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    sendError(res, 'غير مصرح', 401);
    return;
  }

  const { addressId } = req.params;
  req.user.addresses = req.user.addresses.filter((a: any) => a._id?.toString() !== addressId);

  await req.user.save();
  sendSuccess(res, req.user.addresses, 'تم حذف العنوان بنجاح');
}
