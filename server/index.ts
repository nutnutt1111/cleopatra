import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { prisma } from './lib/prisma.js';
import {
  assertAction,
  assertCanExportReports,
  assertRole,
  AuthError,
  toAuthUser,
  type AuthUser,
} from './lib/auth.js';

const app = express();
const PORT = Number(process.env.API_PORT) || 3004;
const JWT_SECRET = process.env.JWT_SECRET || 'donutit-dev-secret';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '12h' });
}

function getUserFromRequest(req: express.Request): AuthUser | null {
  const header = req.headers.authorization;
  const token =
    (header?.startsWith('Bearer ') ? header.slice(7) : null) ||
    (req.cookies?.token as string | undefined);

  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });
    return;
  }
  (req as express.Request & { user: AuthUser }).user = user;
  next();
}

function handleAuthError(err: unknown, res: express.Response) {
  if (err instanceof AuthError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในระบบ' });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'donutit-cleopatra-api' });
});

app.post('/api/auth/login', async (req, res) => {
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
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
    res.json({ user: authUser, token });
  } catch (err) {
    handleAuthError(err, res);
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = (req as express.Request & { user: AuthUser }).user;
  res.json({ user });
});

/** Example Owner-only guard */
app.post('/api/pos/void', requireAuth, (req, res) => {
  try {
    const user = (req as express.Request & { user: AuthUser }).user;
    assertRole(user, 'OWNER', 'MANAGER');
    assertAction(user, 'pos:void');
    res.json({ ok: true, message: 'void endpoint ready (Wave 2)' });
  } catch (err) {
    handleAuthError(err, res);
  }
});

/** Example export guard */
app.get('/api/reports/export', requireAuth, (req, res) => {
  try {
    const user = (req as express.Request & { user: AuthUser }).user;
    assertCanExportReports(user);
    res.json({ ok: true, message: 'export endpoint ready' });
  } catch (err) {
    handleAuthError(err, res);
  }
});

app.listen(PORT, () => {
  console.log(`DonutiT API http://localhost:${PORT}`);
});
