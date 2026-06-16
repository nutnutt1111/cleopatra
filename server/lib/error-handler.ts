import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthUser } from './auth.js';
import { AuthError } from './auth.js';
import { LedgerError } from './ledger.js';
import { PosError } from './pos.js';
import { InventoryError } from './inventory.js';
import { PawnError } from './pawn.js';
import { CustomerError } from './customers.js';
import { MessengerError } from './messenger.js';
import { HrError } from './hr.js';
import { DomainError } from './domain-error.js';

type ErrorResponse = { status: (code: number) => { json: (body: unknown) => void } };

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
    return jwt.sign(user, jwtSecret, { expiresIn: '12h' });
  }

  function getUserFromRequest(req: Request): AuthUser | null {
    const header = req.headers.authorization;
    const token =
      (header?.startsWith('Bearer ') ? header.slice(7) : null) ||
      (req.cookies?.token as string | undefined);

    if (!token) return null;

    try {
      return jwt.verify(token, jwtSecret) as AuthUser;
    } catch {
      return null;
    }
  }

  function requireAuth(req: Request, res: Response, next: NextFunction) {
    const user = getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });
      return;
    }
    (req as Request & { user: AuthUser }).user = user;
    next();
  }

  return { signToken, getUserFromRequest, requireAuth };
}
