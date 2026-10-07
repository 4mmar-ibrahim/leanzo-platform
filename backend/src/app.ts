import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ENV } from './config/env.js';
import { generalLimiter } from './middleware/rateLimitMiddleware.js';
import { errorHandler } from './middleware/errorMiddleware.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import areaRoutes from './routes/areaRoutes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import offerRoutes from './routes/offerRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import adminCouponRoutes from './routes/adminCouponRoutes.js';
import portfolioRoutes from './routes/portfolioRoutes.js';
import faqRoutes from './routes/faqRoutes.js';
import aboutRoutes from './routes/aboutRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import zoRoutes from './routes/zoRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import cmsRoutes from './routes/cmsRoutes.js';
import backupRoutes from './routes/backupRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import technicianRoutes from './routes/technicianRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import path from 'path';

export const app = express();

// Enable trusted proxy for production reverse proxies (Nginx / Cloudflare on Contabo)
app.set('trust proxy', 1);

import { sanitizeNoSql } from './middleware/sanitizationMiddleware.js';

// Serve uploaded media files directly
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Security Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false, // Served by frontend
  })
);

const allowedOrigins = [
  ENV.CLIENT_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        (ENV.NODE_ENV !== 'production' &&
          (origin.startsWith('http://localhost:') ||
            origin.startsWith('http://127.0.0.1:')))
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Idempotency-Key',
      'idempotency-key',
      'X-Idempotency-Key',
      'x-idempotency-key',
      'Accept',
      'Origin',
      'Cache-Control',
      'Pragma',
    ],
    exposedHeaders: ['Idempotency-Key', 'idempotency-key'],
  })
);

// Request parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Custom lightweight cookie parser middleware
import { parseCookies } from './utils/cookies.js';
app.use((req, res, next) => {
  (req as any).cookies = parseCookies(req.headers.cookie);
  next();
});

// NoSQL Injection Sanitizer
app.use(sanitizeNoSql);

if (ENV.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Anti-Stale-Cache: Disallow HTTP caching on dynamic business API endpoints
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Global Rate Limiting
app.use('/api', generalLimiter);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Cleanzo Backend API',
    version: '2.0.0',
  });
});

// API Routes Mounting
app.use('/api/auth/customer', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/auth/admin', adminAuthRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminAuthRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/locations', areaRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/orders', bookingRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/admin/customers', customerRoutes);
app.use('/api/users', adminAuthRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/admin/coupons', adminCouponRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/about', aboutRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', reportRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/zo', zoRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/content', cmsRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/admin/backups', backupRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin/subscriptions', subscriptionRoutes);

// 404 Handler for undefined routes

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `المسار المطلوب غير موجود: ${req.method} ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND',
  });
});

// Centralized Error Handler
app.use(errorHandler);
