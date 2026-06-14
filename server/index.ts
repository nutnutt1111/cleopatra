import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { prisma } from './lib/prisma.js';
import {
  assertCanExportReports,
  AuthError,
  toAuthUser,
  type AuthUser,
} from './lib/auth.js';
import { auditContextFromRequest, runWithAuditContext } from './lib/audit-context.js';
import { createCashflowRouter, handleLedgerError } from './routes/cashflow.js';
import { createPosRouter, handlePosError } from './routes/pos.js';
import { createInventoryRouter, handleInventoryError } from './routes/inventory.js';
import { createPawnRouter, handlePawnError } from './routes/pawn.js';
import { createCustomersRouter, handleCustomerError } from './routes/customers.js';
import { createMessengerRouter, handleMessengerError } from './routes/messenger.js';
import { createHrRouter, handleHrError } from './routes/hr.js';

const app = express();
const PORT = Number(process.env.API_PORT) || 3004;
const JWT_SECRET = process.env.JWT_SECRET || 'donutit-dev-secret';
const DEV_JWT_SECRET = 'donutit-dev-secret';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const RETURN_LOGIN_TOKEN = process.env.LOGIN_RETURN_TOKEN === 'true';

const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3003')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (IS_PRODUCTION && JWT_SECRET === DEV_JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is still the dev default — change before production');
}

app.use(
  helmet(
    IS_PRODUCTION
      ? {}
      : {
          contentSecurityPolicy: false,
          crossOriginEmbedderPolicy: false,
        },
  ),
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  runWithAuditContext(auditContextFromRequest(req), () => next());
});

const loginLimiter = rateLimit({
  windowMs: Number(process.env.LOGIN_RATE_WINDOW_MS ?? 15 * 60 * 1000),
  max: Number(process.env.LOGIN_RATE_MAX ?? 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่' },
});

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
  if (handleLedgerError(err, res)) return;
  if (handlePosError(err, res)) return;
  if (handleInventoryError(err, res)) return;
  if (handlePawnError(err, res)) return;
  if (handleCustomerError(err, res)) return;
  if (handleMessengerError(err, res)) return;
  if (handleHrError(err, res)) return;
  if (err instanceof AuthError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
    res.status(409).json({ error: 'ข้อมูลซ้ำ กรุณาลองใหม่' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในระบบ' });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'donutit-cleopatra-api', wave: 5 });
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
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
      secure: IS_PRODUCTION,
    });
    const body: { user: AuthUser; token?: string } = { user: authUser };
    if (RETURN_LOGIN_TOKEN) {
      body.token = token;
    }
    res.json(body);
  } catch (err) {
    handleAuthError(err, res);
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = (req as express.Request & { user: AuthUser }).user;
  res.json({ user });
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

app.get('/api/reports/export', requireAuth, (req, res) => {
  try {
    const user = (req as express.Request & { user: AuthUser }).user;
    assertCanExportReports(user);
    res.json({ ok: true, message: 'export endpoint ready' });
  } catch (err) {
    handleAuthError(err, res);
  }
});

app.use('/api/cashflow', createCashflowRouter(requireAuth, handleAuthError));
app.use('/api/pos', createPosRouter(requireAuth, handleAuthError));
app.use('/api/inventory', createInventoryRouter(requireAuth, handleAuthError));
app.use('/api/pawn', createPawnRouter(requireAuth, handleAuthError));
app.use('/api/customers', createCustomersRouter(requireAuth, handleAuthError));
app.use('/api/messenger', createMessengerRouter(requireAuth, handleAuthError));
app.use('/api/hr', createHrRouter(requireAuth, handleAuthError));

app.listen(PORT, () => {
  console.log(`DonutiT API http://localhost:${PORT}`);
});
