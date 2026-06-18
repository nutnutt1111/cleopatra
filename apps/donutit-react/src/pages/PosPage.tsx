import { useEffect, useState } from 'react';
import { apiFetch } from '@shared/api';
import { formatTransferDetail } from '@shared/export-utils';
import { PosPaymentBuilder } from '../components/pos/PosPaymentBuilder';
import { TradeInSection } from '../components/pos/TradeInSection';
import type { TransferFields } from '../components/pos/TransferDetailPanel';
import { useToast } from '../components/ui/Toast';

type Product = { id: string; name: string; priceCents: number; priceBaht: string; trackingType: string; serials: { id: string; serialNumber: string }[] };

export function PosPage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('');
  const [serialId, setSerialId] = useState('');
  const [qty, setQty] = useState('1');
  const [discount, setDiscount] = useState('0');
  const [cash, setCash] = useState('');
  const [transfer, setTransfer] = useState('');
  const [transferFields, setTransferFields] = useState<TransferFields>({ bank: '', ref: '', date: '', time: '' });
  const [cart, setCart] = useState<{ productId: string; serialItemId?: string; name: string; qty: number; lineTotalCents: number }[]>([]);

  const product = products.find((p) => p.id === productId);
  const subtotal = cart.reduce((s, c) => s + c.lineTotalCents, 0);
  const discountCents = Math.round(parseFloat(discount || '0') * 100);
  const total = Math.max(0, subtotal - discountCents);

  useEffect(() => {
    apiFetch('/api/inventory/products')
      .then((r) => r.json())
      .then((d) => setProducts(d.products))
      .catch((e) => toast.show(e.message, 'error'));
  }, []);

  function addLine() {
    if (!product) return toast.show('เลือกสินค้า', 'warning');
    const q = product.trackingType === 'SERIALIZED' ? 1 : parseInt(qty, 10);
    let serialItemId: string | undefined;
    if (product.trackingType === 'SERIALIZED') {
      if (!serialId) return toast.show('เลือก Serial', 'warning');
      serialItemId = serialId;
    }
    setCart((c) => [
      ...c,
      {
        productId: product.id,
        serialItemId,
        name: product.name,
        qty: q,
        lineTotalCents: product.priceCents * q,
      },
    ]);
  }

  async function checkout() {
    if (!cart.length) return toast.show('เพิ่มสินค้าก่อน', 'warning');
    const cashCents = Math.round(parseFloat(cash || '0') * 100);
    const transferCents = Math.round(parseFloat(transfer || '0') * 100);
    if (cashCents + transferCents !== total) {
      return toast.show(`ยอดชำระไม่ตรงยอดรวม`, 'warning');
    }
    const payments: { channel: string; amount: number; transferDetail?: string }[] = [];
    if (cashCents > 0) payments.push({ channel: 'CASH', amount: cashCents / 100 });
    if (transferCents > 0) {
      const transferDetail = formatTransferDetail(transferFields);
      if (!transferDetail) return toast.show('กรอกรายละเอียดการโอน', 'warning');
      payments.push({ channel: 'TRANSFER', amount: transferCents / 100, transferDetail });
    }
    const res = await apiFetch('/api/pos/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines: cart.map((c) => ({ productId: c.productId, serialItemId: c.serialItemId, qty: c.qty })),
        payments,
        discount: discountCents / 100,
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.show(data.error || 'ชำระไม่สำเร็จ', 'error');
    toast.show(`บิล ${data.bill.billNumber} สำเร็จ`, 'success');
    setCart([]);
    setCash('');
    setTransfer('');
    setTransferFields({ bank: '', ref: '', date: '', time: '' });
  }

  return (
    <main className="pos-page">
      <h1 className="text-xl font-semibold mb-4">ขายหน้าร้าน (POS)</h1>
      <div className="pos-layout">
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-medium mb-2">เพิ่มสินค้า</h3>
            <div className="field mb-2">
              <select value={productId} onChange={(e) => { setProductId(e.target.value); setSerialId(''); }}>
                <option value="">-- เลือกสินค้า --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.priceBaht} บาท)</option>
                ))}
              </select>
            </div>
            {product?.trackingType === 'SERIALIZED' && (
              <div className="field mb-2">
                <select value={serialId} onChange={(e) => setSerialId(e.target.value)}>
                  <option value="">-- เลือก Serial --</option>
                  {product.serials.map((s) => (
                    <option key={s.id} value={s.id}>{s.serialNumber}</option>
                  ))}
                </select>
              </div>
            )}
            {product?.trackingType !== 'SERIALIZED' && (
              <div className="field mb-2">
                <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>
            )}
            <button type="button" className="btn w-full" onClick={addLine}>เพิ่มในบิล</button>
          </div>
          <TradeInSection />
          <div className="card">
            <h3 className="font-medium mb-2">ตะกร้า</h3>
            {cart.map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-1 border-b border-[var(--border)]">
                <span>{item.name} x{item.qty}</span>
                <span>{(item.lineTotalCents / 100).toFixed(2)}</span>
              </div>
            ))}
            <div className="mt-2 text-sm flex justify-between">
              <span>สุทธิ</span>
              <strong>{(total / 100).toFixed(2)}</strong>
            </div>
            <div className="field mt-2">
              <label>ส่วนลด (บาท)</label>
              <input value={discount} onChange={(e) => setDiscount(e.target.value)} type="number" min="0" step="0.01" />
            </div>
          </div>
        </div>
        <aside className="pos-checkout-column">
          <div className="pos-summary cleo-panel cleo-panel--accent card">
            <PosPaymentBuilder
              cash={cash}
              transfer={transfer}
              transferFields={transferFields}
              onCashChange={setCash}
              onTransferChange={setTransfer}
              onTransferFieldsChange={setTransferFields}
            />
            <button type="button" className="btn btn-primary w-full mt-4" onClick={checkout}>
              ชำระเงิน
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
