/** Store-local date helpers (Asia/Bangkok) for document numbers */

const BANGKOK_TZ = 'Asia/Bangkok';

/** YYYYMMDD in Bangkok timezone */
export function storeTodayYmd(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGKOK_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  const d = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${y}${m}${d}`;
}

/** Daily document prefix e.g. POS-20260613 */
export function todayDocPrefix(label: string, date = new Date()): string {
  return `${label}-${storeTodayYmd(date)}`;
}
