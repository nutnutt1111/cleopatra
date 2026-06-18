import { TransferDetailPanel, type TransferFields } from './TransferDetailPanel';

type Props = {
  cash: string;
  transfer: string;
  transferFields: TransferFields;
  onCashChange: (v: string) => void;
  onTransferChange: (v: string) => void;
  onTransferFieldsChange: (v: TransferFields) => void;
};

export function PosPaymentBuilder({
  cash,
  transfer,
  transferFields,
  onCashChange,
  onTransferChange,
  onTransferFieldsChange,
}: Props) {
  const transferAmount = parseFloat(transfer || '0');

  return (
    <div className="pos-payment-builder">
      <h3 className="font-medium mb-3">ชำระเงิน (แยกจ่ายได้)</h3>
      <div className="pos-payment-builder__rows">
        <div className="pos-payment-builder__row card form-grid-2">
          <div className="field">
            <label>เงินสด</label>
            <input type="number" min="0" step="0.01" value={cash} onChange={(e) => onCashChange(e.target.value)} />
          </div>
          <div className="field">
            <label>โอน</label>
            <input type="number" min="0" step="0.01" value={transfer} onChange={(e) => onTransferChange(e.target.value)} />
          </div>
        </div>
        <div className="pos-payment-builder__row card">
          <TransferDetailPanel
            visible={transferAmount > 0}
            value={transferFields}
            onChange={onTransferFieldsChange}
          />
        </div>
      </div>
    </div>
  );
}
