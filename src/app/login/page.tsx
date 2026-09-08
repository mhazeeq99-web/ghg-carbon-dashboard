'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight } from 'lucide-react';

type Notice = { text: string; kind: 'ok' | 'error' };

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submit() {
    if (pin.length !== 4 || submitting) return;

    setSubmitting(true);
    setNotice(null);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (res.ok) {
        setNotice({ text: 'Welcome.', kind: 'ok' });
        router.replace('/');
        return;
      }

      setPin('');
      setNotice({
        text: data.error || 'Login failed.',
        kind: 'error',
      });
    } catch {
      setNotice({ text: 'Something went wrong. Try again.', kind: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  function onChange(value: string) {
    setPin(value.replace(/\D/g, '').slice(0, 4));
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">
          <ShieldCheck size={26} />
        </div>

        <h1 className="login-title">Restricted</h1>
        <p className="login-sub">Enter your 4-digit PIN to continue</p>

        <input
          ref={inputRef}
          className="login-input"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          value={pin}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder="••••"
        />

        <button
          className="btn login-btn"
          onClick={submit}
          disabled={pin.length !== 4 || submitting}
        >
          {submitting ? 'Checking…' : 'Unlock'}
          {!submitting && <ArrowRight size={14} />}
        </button>

        {notice && (
          <div
            className={`alert ${
              notice.kind === 'ok' ? 'alert-ok' : 'alert-error'
            }`}
            style={{ marginTop: 6, width: '100%', boxSizing: 'border-box' }}
          >
            {notice.text}
          </div>
        )}
      </div>
    </div>
  );
}
