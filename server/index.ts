import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
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
  console.error(err);
  res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในระบบ' });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'donutit-cleopatra-api', wave: 5 });
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
