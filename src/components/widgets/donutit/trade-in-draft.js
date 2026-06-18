const STORAGE_KEY = 'donutit:trade-in-drafts';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(drafts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

function newId() {
  return `ti-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** @typedef {{
 *   id: string;
 *   createdAt: string;
 *   deviceName: string;
 *   serialNumber: string;
 *   sku: string;
 *   costBaht: number;
 *   priceBaht: number;
 *   customerName: string;
 *   notes: string;
 * }} TradeInDraft */

/** @returns {TradeInDraft[]} */
export function listTradeInDrafts() {
  return readAll().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/** @param {Omit<TradeInDraft, 'id' | 'createdAt'>} input */
export function saveTradeInDraft(input) {
  const draft = {
    id: newId(),
    createdAt: new Date().toISOString(),
    deviceName: input.deviceName?.trim() || '',
    serialNumber: input.serialNumber?.trim() || '',
    sku: input.sku?.trim() || '',
    costBaht: Number(input.costBaht) || 0,
    priceBaht: Number(input.priceBaht) || 0,
    customerName: input.customerName?.trim() || '',
    notes: input.notes?.trim() || '',
  };
  const drafts = readAll();
  drafts.unshift(draft);
  writeAll(drafts);
  return draft;
}

/** @param {string} id */
export function getTradeInDraft(id) {
  return readAll().find((d) => d.id === id) ?? null;
}

/** @param {string} id */
export function removeTradeInDraft(id) {
  writeAll(readAll().filter((d) => d.id !== id));
}

export function formatDraftLabel(draft) {
  const when = new Date(draft.createdAt).toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const serial = draft.serialNumber ? ` · ${draft.serialNumber}` : '';
  const customer = draft.customerName ? ` · ${draft.customerName}` : '';
  return `${draft.deviceName || 'ไม่ระบุชื่อ'}${serial}${customer} (${when})`;
}
