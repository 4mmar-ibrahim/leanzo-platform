import { Request, Response } from 'express';
import { CookieOptions } from 'express';

export const COOKIE_NAMES = {
  CUSTOMER_REFRESH: 'cleanzo_customer_refresh_token',
  ADMIN_REFRESH: 'cleanzo_admin_refresh_token',
  ADMIN_TOKEN: 'cleanzo_admin_token', // Legacy/mirror admin cookie
} as const;

export function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, str) => {
    const trimmed = str.trim();
    if (!trimmed) return acc;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return acc;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key) {
      try {
        acc[key] = decodeURIComponent(val);
      } catch {
        acc[key] = val;
      }
    }
    return acc;
  }, {} as Record<string, string>);
}

export function getCookieFromRequest(req: Request, name: string): string | null {
  if ((req as any).cookies && (req as any).cookies[name]) {
    return (req as any).cookies[name];
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[name] || null;
}

export function setRefreshCookie(
  req: Request,
  res: Response,
  name: string,
  token: string,
  maxAgeMs = 30 * 24 * 60 * 60 * 1000 // 30 days
): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  
  const options: CookieOptions = {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };

  res.cookie(name, token, options);
}

export function clearRefreshCookie(
  req: Request,
  res: Response,
  name: string
): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

  const options: CookieOptions = {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  };

  res.clearCookie(name, options);
}
