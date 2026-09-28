import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'ADMIN_JWT_SECRET',
    'CUSTOMER_REFRESH_SECRET',
    'ADMIN_REFRESH_SECRET',
    'CLIENT_URL',
  ] as const;

  const missing = requiredVars.filter((varName) => !process.env[varName]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `[FATAL] Missing required environment variables in production: ${missing.join(', ')}`
    );
  }
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL || (isProduction ? '' : 'postgresql://postgres:postgres@127.0.0.1:5432/cleanzo_db?schema=public'),
  JWT_SECRET: process.env.JWT_SECRET || (isProduction ? '' : 'dev_jwt_secret_key_not_for_production'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  CUSTOMER_REFRESH_SECRET: process.env.CUSTOMER_REFRESH_SECRET || (isProduction ? '' : (process.env.JWT_SECRET ? process.env.JWT_SECRET + '_customer_refresh' : 'dev_customer_refresh_secret')),
  ADMIN_JWT_SECRET: process.env.ADMIN_JWT_SECRET || (isProduction ? '' : 'dev_admin_jwt_secret_key_not_for_production'),
  ADMIN_REFRESH_SECRET: process.env.ADMIN_REFRESH_SECRET || (isProduction ? '' : (process.env.ADMIN_JWT_SECRET ? process.env.ADMIN_JWT_SECRET + '_admin_refresh' : 'dev_admin_refresh_secret')),
  CLIENT_URL: process.env.CLIENT_URL || (isProduction ? '' : 'http://localhost:3000'),
  API_PREFIX: process.env.API_PREFIX || '/api',
  IS_PRODUCTION: isProduction,
};
