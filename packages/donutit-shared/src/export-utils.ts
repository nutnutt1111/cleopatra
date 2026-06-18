function escapeCsvCell(value: unknown) {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function rowsToCsv(columns: { key: string; label: string }[], rows: Record<string, unknown>[]) {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(',');
  const body = rows.map((row) => columns.map((c) => escapeCsvCell(row[c.key])).join(','));
  return [header, ...body].join('\n');
}

export function downloadCsv(filename: string, csvText: string) {
  const blob = new Blob(['\uFEFF' + csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function formatTransferTimeLabel(value: string) {
  if (!value) return 'ยังไม่เลือกเวลา';
  const [h, m] = value.split(':');
  return `เวลา ${h}:${m} น.`;
}

export function formatTransferDetail(parts: {
  bank?: string;
  ref?: string;
  date?: string;
  time?: string;
}) {
  const out: string[] = [];
  if (parts.bank?.trim()) out.push(parts.bank.trim());
  if (parts.ref?.trim()) out.push(`อ้างอิง ${parts.ref.trim()}`);
  if (parts.date) {
    const [y, mo, d] = parts.date.split('-');
    const dateLabel = `${d}/${mo}/${y}`;
    out.push(parts.time ? `${dateLabel} ${parts.time} น.` : dateLabel);
  } else if (parts.time) {
    out.push(`${parts.time} น.`);
  }
  return out.join(' · ');
}

export function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

export function nowInputTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
