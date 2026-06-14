import { AsyncLocalStorage } from 'node:async_hooks';
import type express from 'express';

export type AuditMeta = {
  ip?: string;
  userAgent?: string;
};

const auditStore = new AsyncLocalStorage<AuditMeta>();

export function runWithAuditContext<T>(meta: AuditMeta, fn: () => T): T {
  return auditStore.run(meta, fn);
}

export function getAuditMeta(): AuditMeta | undefined {
  return auditStore.getStore();
}

export function auditContextFromRequest(req: express.Request): AuditMeta {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ||
    req.socket.remoteAddress ||
    undefined;
  const userAgent = req.headers['user-agent'];
  return { ip, userAgent };
}

export function mergeAuditPayload(payload?: Record<string, unknown>): Record<string, unknown> | undefined {
  const meta = getAuditMeta();
  if (!meta?.ip && !meta?.userAgent && !payload) return payload;
  return {
    ...payload,
    ...(meta?.ip ? { ip: meta.ip } : {}),
    ...(meta?.userAgent ? { userAgent: meta.userAgent } : {}),
  };
}

export function serializeAuditPayload(payload: Record<string, unknown>): string {
  return JSON.stringify(mergeAuditPayload(payload) ?? payload);
}
