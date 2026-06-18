import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@shared/api';
import { useToast } from '../components/ui/Toast';

type Job = {
  id: string;
  jobNumber: string;
  customerName: string;
  customerPhone: string | null;
  address: string;
  description: string | null;
  deliveryFeeBaht: string;
  feeChannel: string;
  status: string;
  statusLabel: string;
  cancelReason: string | null;
};

export function MessengerPage() {
  const toast = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    address: '',
    description: '',
    deliveryFee: '',
    feeChannel: 'CASH',
  });

  async function reload() {
    const res = await apiFetch('/api/messenger/jobs');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setJobs(data.jobs);
  }

  useEffect(() => {
    reload().catch((e) => toast.show(e.message, 'error'));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!form.customerName.trim() || !form.address.trim()) {
      return toast.show('กรอกชื่อลูกค้าและที่อยู่', 'warning');
    }
    const res = await apiFetch('/api/messenger/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim() || undefined,
        address: form.address.trim(),
        description: form.description.trim() || undefined,
        deliveryFee: Number(form.deliveryFee) || 0,
        feeChannel: form.feeChannel,
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.show(data.error, 'error');
    toast.show(`สร้างงาน ${data.job.jobNumber}`, 'success');
    setForm({ customerName: '', customerPhone: '', address: '', description: '', deliveryFee: '', feeChannel: 'CASH' });
    reload();
  }

  return (
    <main data-donutit-module="messenger">
      <h1 className="text-xl font-semibold mb-4">Messenger</h1>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <form className="card space-y-3" onSubmit={onCreate}>
          <h2 className="font-medium">สร้างงานส่ง</h2>
          <input className="input w-full" placeholder="ชื่อลูกค้า" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          <input className="input w-full" placeholder="เบอร์โทร" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
          <input className="input w-full" placeholder="ที่อยู่จัดส่ง" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <input className="input w-full" type="number" placeholder="ค่าส่ง (บาท)" value={form.deliveryFee} onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })} />
          <button type="submit" className="btn btn-primary w-full">
            สร้างงาน
          </button>
        </form>
        <div className="card">
          <h2 className="font-medium mb-3">งานส่ง</h2>
          <div id="messenger-jobs" className="space-y-2 max-h-[70vh] overflow-y-auto">
            {jobs.map((j) => (
              <div key={j.id} className={`cleo-panel p-3 text-sm ${j.status === 'CANCELLED' ? 'opacity-60' : ''}`}>
                <p className="font-medium">{j.jobNumber}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{j.customerName}</p>
                <p className="mt-1">{j.address}</p>
                <p>
                  ค่าส่ง <strong>{j.deliveryFeeBaht}</strong> บาท · {j.statusLabel}
                </p>
                {(j.status === 'PENDING' || j.status === 'IN_TRANSIT') && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary mt-2"
                    onClick={async () => {
                      const res = await apiFetch(`/api/messenger/jobs/${j.id}/deliver`, { method: 'POST' });
                      const data = await res.json();
                      if (!res.ok) return toast.show(data.error, 'error');
                      toast.show(`ส่งสำเร็จ ${data.jobNumber}`, 'success');
                      reload();
                    }}
                  >
                    ส่งสำเร็จ
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
