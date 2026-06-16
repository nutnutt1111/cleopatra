import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const CSRF_COOKIE = 'csrf';

export function issueCsrfToken(res: Response, isProduction: boolean): string {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: 'lax',
    secure: isProduction,
  });
  return token;
}

export function createCsrfMiddleware(isProduction: boolean, corsOrigins: string[]) {
  return function csrfProtect(req: Request, res: Response, next: NextFunction) {
    if (process.env.CSRF_ENFORCE === 'false') {
      next();
      return;
    }
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      next();
      return;
    }
    if (req.path === '/api/auth/login') {
      next();
      return;
    }

    const origin = req.headers.origin;
    if (origin && !corsOrigins.includes(origin)) {
      res.status(403).json({ error: 'Origin not allowed' });
      return;
    }

    const cookieToken = req.cookies?.[CSRF_COOKIE] as string | undefined;
    const headerToken = req.headers['x-csrf-token'];
    if (!cookieToken || typeof headerToken !== 'string' || headerToken !== cookieToken) {
      res.status(403).json({ error: 'CSRF token invalid' });
      return;
    }
    next();
  };
}
