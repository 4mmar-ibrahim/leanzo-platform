import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';

const sessionSecretNames = [
  'JWT_SECRET', 'ADMIN_JWT_SECRET', 'CUSTOMER_REFRESH_SECRET', 'ADMIN_REFRESH_SECRET',
] as const;

if (isProduction) {
  const requiredVars = [
    'DATABASE_URL',
    ...sessionSecretNames,
    'CLIENT_URL',
  ] as const;

  const missing = requiredVars.filter((varName) => !process.env[varName]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `[FATAL] Missing required environment variables in production: ${missing.join(', ')}`
    );
  }
  const secrets = sessionSecretNames.map(name => process.env[name]!.trim());
  if (secrets.some(secret => secret.length < 32 || /^your_/i.test(secret)) ||
      new Set(secrets).size !== sessionSecretNames.length) {
    throw new Error('Production session secrets must be distinct and contain at least 32 characters each.');
  }
}

function sessionSecret(name: string): string {
  return process.env[name]?.trim() || randomBytes(48).toString('hex');
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL?.trim(),
  JWT_SECRET: sessionSecret('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  CUSTOMER_REFRESH_SECRET: sessionSecret('CUSTOMER_REFRESH_SECRET'),
  ADMIN_JWT_SECRET: sessionSecret('ADMIN_JWT_SECRET'),
  ADMIN_REFRESH_SECRET: sessionSecret('ADMIN_REFRESH_SECRET'),
  CLIENT_URL: process.env.CLIENT_URL || (isProduction ? '' : 'http://localhost:3000'),
  API_PREFIX: process.env.API_PREFIX || '/api',
  IS_PRODUCTION: isProduction,
};

if (!process.env.DATABASE_URL && ENV.DATABASE_URL) {
  process.env.DATABASE_URL = ENV.DATABASE_URL;
}
