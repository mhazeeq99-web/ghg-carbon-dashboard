'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Enforces "log out when the tab is closed".
 *
 * The auth cookie is a session cookie, but browsers keep those until the whole
 * browser closes. A per-tab flag in sessionStorage closes the gap: sessionStorage
 * is cleared when the tab closes, so a fresh tab can never reuse the cookie.
 */
export function SessionGuard() {
  const router = useRouter();

  useEffect(() => {
    if (sessionStorage.getItem('ghg_session') === '1') return;

    // No tab session — drop the cookie and send them back to the PIN screen.
    fetch('/api/logout', { method: 'POST' }).catch(() => {});
    router.replace('/login');
  }, [router]);

  return null;
}
