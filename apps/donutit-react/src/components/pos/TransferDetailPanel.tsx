import { useEffect } from 'react';
import {
  formatTransferDetail,
  formatTransferTimeLabel,
  nowInputTime,
  todayInputDate,
} from '@shared/export-utils';

export type TransferFields = {
  bank: string;
  ref: string;
  date: string;
  time: string;
};

type Props = {
  value: TransferFields;
  onChange: (next: TransferFields) => void;
  visible: boolean;
};

export function TransferDetailPanel({ value, onChange, visible }: Props) {
  useEffect(() => {
    if (visible && !value.date && !value.time) {
      onChange({ ...value, date: todayInputDate(), time: nowInputTime() });
    }
  }, [visible]);

  if (!visible) return null;

  function set<K extends keyof TransferFields>(key: K, v: string) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="transfer-panel form-grid-2 card">
      <p className="text-xs font-medium" style={{ gridColumn: '1 / -1' }}>
        รายละเอียดการโอน
      </p>
      <div className="field">
        <label>ธนาคาร</label>
        <input
          list="bank-list"
          placeholder="เช่น กสิกร, กรุงไทย"
          value={value.bank}
          onChange={(e) => set('bank', e.target.value)}
        />
        <datalist id="bank-list">
          <option value="กสิกรไทย" />
          <option value="กรุงไทย" />
          <option value="กรุงเทพ" />
          <option value="ไทยพาณิชย์" />
        </datalist>
      </div>
      <div className="field">
        <label>เลขอ้างอิง / เลขท้ายสลิป</label>
        <input value={value.ref} onChange={(e) => set('ref', e.target.value)} placeholder="REF123456" />
      </div>
      <div className="field">
        <label>วันที่โอน</label>
        <input type="date" value={value.date} onChange={(e) => set('date', e.target.value)} />
      </div>
      <div className="field">
        <label>เวลาโอน</label>
        <input type="time" step={60} value={value.time} onChange={(e) => set('time', e.target.value)} />
        <p className="text-xs text-[var(--muted-foreground)] mt-1">{formatTransferTimeLabel(value.time)}</p>
      </div>
      {value.bank || value.ref || value.date || value.time ? (
        <p className="text-xs text-[var(--muted-foreground)]" style={{ gridColumn: '1 / -1' }}>
          สรุป: {formatTransferDetail(value)}
        </p>
      ) : null}
    </div>
  );
}
