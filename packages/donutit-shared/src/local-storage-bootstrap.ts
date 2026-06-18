import { STORAGE_KEY, type TradeInDraft } from './trade-in-draft';

const BOOTSTRAP_FLAG = 'donutit:local-storage-bootstrapped';
const BOOTSTRAP_URL = '/data/local-storage/trade-in-drafts.json';

function isTradeInDraft(v: unknown): v is TradeInDraft {
  if (!v || typeof v !== 'object') return false;
  const d = v as Record<string, unknown>;
  return (
    typeof d.id === 'string' &&
    typeof d.createdAt === 'string' &&
    typeof d.deviceName === 'string'
  );
}

/** Load trade-in drafts from repo file into localStorage (first run only). */
export async function bootstrapLocalStorageFromRepo() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(BOOTSTRAP_FLAG)) return;
  if (localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(BOOTSTRAP_FLAG, '1');
    return;
  }

  try {
    const res = await fetch(BOOTSTRAP_URL, { cache: 'no-store' });
    if (!res.ok) return;
    const parsed = (await res.json()) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return;
    const drafts = parsed.filter(isTradeInDraft);
    if (!drafts.length) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    localStorage.setItem(BOOTSTRAP_FLAG, '1');
  } catch {
    // offline or missing file — skip
  }
}

/** Dev helper: copy current localStorage drafts to clipboard as JSON. */
export function exportTradeInDraftsToJson() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ?? '[]';
}
