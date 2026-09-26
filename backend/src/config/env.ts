import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:1234@127.0.0.1:5432/cleanzo_db?schema=public',
  JWT_SECRET: process.env.JWT_SECRET || 'cleanzo_fallback_super_secret_jwt_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  CUSTOMER_REFRESH_SECRET: process.env.CUSTOMER_REFRESH_SECRET || (process.env.JWT_SECRET ? process.env.JWT_SECRET + '_customer_refresh_2026' : 'cleanzo_customer_refresh_secret_2026'),
  ADMIN_JWT_SECRET: process.env.ADMIN_JWT_SECRET || 'cleanzo_admin_fallback_secret_key_2026',
  ADMIN_REFRESH_SECRET: process.env.ADMIN_REFRESH_SECRET || (process.env.ADMIN_JWT_SECRET ? process.env.ADMIN_JWT_SECRET + '_admin_refresh_2026' : 'cleanzo_admin_refresh_secret_2026'),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  API_PREFIX: process.env.API_PREFIX || '/api',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
};
