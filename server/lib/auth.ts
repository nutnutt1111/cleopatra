import type { Role, User } from '../../src/generated/prisma/client.js';

export type AuthUser = Pick<
  User,
  'id' | 'email' | 'name' | 'role' | 'canExportReports' | 'storeId'
>;

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

const OWNER_ONLY_ACTIONS = new Set([
  'pos:void',
  'pos:delete',
  'daily-close:unlock',
  'discount:approve',
  'customer:credit-override',
]);

const EXPORT_ACTION = 'reports:export';

/** Server-side role gate — use on every sensitive API route */
export function assertRole(user: AuthUser, ...allowed: Role[]): void {
  if (!allowed.includes(user.role)) {
    throw new AuthError(`บทบาท ${user.role} ไม่มีสิทธิ์ทำรายการนี้`, 403);
  }
}

/** Owner-only dangerous actions */
export function assertOwnerOnly(user: AuthUser, action: string): void {
  if (OWNER_ONLY_ACTIONS.has(action) && user.role !== 'OWNER') {
    throw new AuthError(`เฉพาะ Owner เท่านั้นที่ทำ ${action} ได้`, 403);
  }
}

/** Report/export permission */
export function assertCanExportReports(user: AuthUser): void {
  if (user.role === 'OWNER') return;
  if (!user.canExportReports) {
    throw new AuthError('ไม่มีสิทธิ์ส่งออกรายงาน', 403);
  }
}

export function assertAction(user: AuthUser, action: string): void {
  if (action === EXPORT_ACTION) {
    assertCanExportReports(user);
    return;
  }
  assertOwnerOnly(user, action);
}

export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    canExportReports: user.canExportReports,
    storeId: user.storeId,
  };
}
