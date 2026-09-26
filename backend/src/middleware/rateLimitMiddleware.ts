import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5000 : 50000, // Generous limit for real workloads
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // 1. Never rate-limit admin routes or authenticated staff/admin operations
    if (
      req.originalUrl?.includes('/admin') ||
      req.originalUrl?.includes('/locations/admin') ||
      req.headers.authorization?.startsWith('Bearer ')
    ) {
      return true;
    }
    // 2. Skip localhost and internal loopback
    const ip = req.ip || req.socket?.remoteAddress || '';
    if (
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip === '::ffff:127.0.0.1' ||
      req.hostname === 'localhost'
    ) {
      return true;
    }
    return false;
  },
  message: {
    success: false,
    message: 'تم تجاوز الحد المسموح به من الطلبات، يرجى الانتظار قليلاً ثم المحاولة مجدداً',
    code: 'TOO_MANY_REQUESTS',
  },
});

export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.NODE_ENV === 'production' ? 20 : 500, // higher limit in dev for automated test runs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'محاولات دخول متكررة، يرجى الانتظار 10 دقائق والمحاولة مرة أخرى لحماية حسابك',
    code: 'AUTH_RATE_LIMITED',
  },
});

export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit contact submissions
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'تم إرسال رسالتك بالفعل، يرجى الانتظار قبل إرسال رسالة أخرى',
    code: 'CONTACT_RATE_LIMITED',
  },
});
