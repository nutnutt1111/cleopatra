import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '@shared/api';
import { useToast } from '../components/ui/Toast';

export function LoginPage() {
  const [email, setEmail] = useState('owner@donutit.local');
  const [password, setPassword] = useState('donutit-dev');
  const navigate = useNavigate();
  const toast = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ', 'error');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-3">
        <h1 className="text-xl font-semibold">donutit-cleopatra</h1>
        <p className="text-sm text-[var(--muted-foreground)]">DonutiT · localhost:3005</p>
        <div className="field">
          <label htmlFor="email">อีเมล</label>
          <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">รหัสผ่าน</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary w-full">
          เข้าสู่ระบบ
        </button>
      </form>
    </div>
  );
}
