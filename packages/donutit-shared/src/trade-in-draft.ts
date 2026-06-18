export const STORAGE_KEY = 'donutit:trade-in-drafts';

export type TradeInDraft = {
  id: string;
  createdAt: string;
  deviceName: string;
  serialNumber: string;
  sku: string;
  costBaht: number;
  priceBaht: number;
  customerName: string;
  notes: string;
};

function readAll(): TradeInDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as TradeInDraft[]) : [];
  } catch {
    return [];
  }
}

function writeAll(drafts: TradeInDraft[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

function newId() {
  return `ti-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listTradeInDrafts(): TradeInDraft[] {
  return readAll().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function saveTradeInDraft(input: Omit<TradeInDraft, 'id' | 'createdAt'>): TradeInDraft {
  const draft: TradeInDraft = {
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

export function getTradeInDraft(id: string) {
  return readAll().find((d) => d.id === id) ?? null;
}

export function removeTradeInDraft(id: string) {
  writeAll(readAll().filter((d) => d.id !== id));
}

export function formatDraftLabel(draft: TradeInDraft) {
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

export function suggestSkuFromDraft(draft: Pick<TradeInDraft, 'deviceName' | 'serialNumber'>) {
  const base = (draft.deviceName || 'TRADEIN')
    .replace(/[^a-zA-Z0-9ก-๙]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20)
    .toUpperCase();
  const tail = draft.serialNumber ? `-${draft.serialNumber.slice(-4)}` : '';
  return `${base || 'TRADEIN'}${tail}`;
}
