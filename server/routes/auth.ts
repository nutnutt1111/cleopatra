import { Router } from 'express';
import type { Request, Response } from 'express';
import type { RateLimitRequestHandler } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { assertCanExportReports, toAuthUser, type AuthUser } from '../lib/auth.js';
import type { AuthedRequest } from '../lib/types.js';

type AuthDeps = {
  loginLimiter: RateLimitRequestHandler;
  signToken: (user: AuthUser) => string;
  requireAuth: (req: Request, res: Response, next: () => void) => void;
  handleError: (err: unknown, res: Response) => void;
  isProduction: boolean;
  returnLoginToken: boolean;
};

export function createAuthRouter({
  loginLimiter,
  signToken,
  requireAuth,
  handleError,
  isProduction,
  returnLoginToken,
}: AuthDeps) {
  const router = Router();

  router.post('/login', loginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      if (!email || !password) {
        res.status(400).json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        return;
      }

      const authUser = toAuthUser(user);
      const token = signToken(authUser);
      res.cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
      });
      const body: { user: AuthUser; token?: string } = { user: authUser };
      if (returnLoginToken) {
        body.token = token;
      }
      res.json(body);
    } catch (err) {
      handleError(err, res);
    }
  });

  router.get('/me', requireAuth, (req, res) => {
    const user = (req as AuthedRequest).user;
    res.json({ user });
  });

  router.post('/logout', (_req, res) => {
    res.clearCookie('token');
    res.json({ ok: true });
  });

  return router;
}

export function createReportsRouter(
  requireAuth: AuthDeps['requireAuth'],
  handleError: AuthDeps['handleError'],
) {
  const router = Router();

  router.get('/export', requireAuth, (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      assertCanExportReports(user);
      res.json({ ok: true, message: 'export endpoint ready' });
    } catch (err) {
      handleError(err, res);
    }
  });

  return router;
}
