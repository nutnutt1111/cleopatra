import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import { auditContextFromRequest, runWithAuditContext } from './lib/audit-context.js';
import { createAuthMiddleware, handleApiError } from './lib/error-handler.js';
import { createCashflowRouter } from './routes/cashflow.js';
import { createPosRouter } from './routes/pos.js';
import { createInventoryRouter } from './routes/inventory.js';
import { createPawnRouter } from './routes/pawn.js';
import { createCustomersRouter } from './routes/customers.js';
import { createMessengerRouter } from './routes/messenger.js';
import { createHrRouter } from './routes/hr.js';
import { createAuthRouter, createReportsRouter } from './routes/auth.js';

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

const { signToken, requireAuth } = createAuthMiddleware(JWT_SECRET);
const handleError = handleApiError;

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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'donutit-cleopatra-api', wave: 5 });
});

app.use(
  '/api/auth',
  createAuthRouter({
    loginLimiter,
    signToken,
    requireAuth,
    handleError,
    isProduction: IS_PRODUCTION,
    returnLoginToken: RETURN_LOGIN_TOKEN,
  }),
);
app.use('/api/reports', createReportsRouter(requireAuth, handleError));

app.use('/api/cashflow', createCashflowRouter(requireAuth, handleError));
app.use('/api/pos', createPosRouter(requireAuth, handleError));
app.use('/api/inventory', createInventoryRouter(requireAuth, handleError));
app.use('/api/pawn', createPawnRouter(requireAuth, handleError));
app.use('/api/customers', createCustomersRouter(requireAuth, handleError));
app.use('/api/messenger', createMessengerRouter(requireAuth, handleError));
app.use('/api/hr', createHrRouter(requireAuth, handleError));

app.listen(PORT, () => {
  console.log(`DonutiT API http://localhost:${PORT}`);
});
