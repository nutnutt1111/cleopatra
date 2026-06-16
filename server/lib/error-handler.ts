import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthUser } from './auth.js';
import { toAuthUser } from './auth.js';
import { AuthError } from './auth.js';
import { LedgerError } from './ledger.js';
import { PosError } from './pos.js';
import { InventoryError } from './inventory.js';
import { PawnError } from './pawn.js';
import { CustomerError } from './customers.js';
import { MessengerError } from './messenger.js';
import { HrError } from './hr.js';
import { DomainError } from './domain-error.js';
import { prisma } from './prisma.js';

type ErrorResponse = { status: (code: number) => { json: (body: unknown) => void } };

type JwtIdentity = { userId: string; storeId?: string };

const DOMAIN_ERRORS = [
  AuthError,
  LedgerError,
  PosError,
  InventoryError,
  PawnError,
  CustomerError,
  MessengerError,
  HrError,
  DomainError,
];

export function handleApiError(err: unknown, res: ErrorResponse): void {
  for (const ErrClass of DOMAIN_ERRORS) {
    if (err instanceof ErrClass) {
      res.status(err.status).json({ error: err.message });
      return;
    }
  }
  if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
    res.status(409).json({ error: 'ข้อมูลซ้ำ กรุณาลองใหม่' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในระบบ' });
}

export function createAuthMiddleware(jwtSecret: string) {
  function signToken(user: AuthUser): string {
    const payload: JwtIdentity = { userId: user.id, storeId: user.storeId };
    return jwt.sign(payload, jwtSecret, { expiresIn: '12h' });
  }

  function getTokenPayload(req: Request): JwtIdentity | null {
    const header = req.headers.authorization;
    const token =
      (header?.startsWith('Bearer ') ? header.slice(7) : null) ||
      (req.cookies?.token as string | undefined);

    if (!token) return null;

    try {
      const decoded = jwt.verify(token, jwtSecret);
      if (!decoded || typeof decoded !== 'object' || !('userId' in decoded)) return null;
      return decoded as JwtIdentity;
    } catch {
      return null;
    }
  }

  async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const payload = getTokenPayload(req);
    if (!payload?.userId) {
      res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });
      return;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!dbUser) {
      res.status(401).json({ error: 'เซสชันหมดอายุ' });
      return;
    }

    (req as Request & { user: AuthUser }).user = toAuthUser(dbUser);
    next();
  }

  return { signToken, getTokenPayload, requireAuth };
}
