'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Blocks protected content until the tab session is proven, and logs out when
 * the tab no longer has one.
 *
 * The auth cookie is a session cookie, but browsers keep those until the whole
 * browser closes — so a reopened tab would still carry it. The per-tab flag in
 * sessionStorage is cleared when the tab closes, so:
 *   - no flag -> render nothing protected (no flash of the dashboard)
 *   - no flag -> clear the cookie FIRST, then go to /login. If we navigate
 *     before the logout lands, the proxy still sees a valid cookie and bounces
 *     /login straight back to the dashboard.
 */
export function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Yield first so this stays out of the effect's synchronous body.
      await Promise.resolve();

      if (sessionStorage.getItem('ghg_session') === '1') {
        if (!cancelled) setAllowed(true);
        return;
      }

      try {
        // Await the logout so the cookie is gone before we navigate;
        // otherwise the proxy still sees a valid cookie and bounces /login
        // straight back to the dashboard.
        await fetch('/api/logout', { method: 'POST' });
      } catch {
        /* ignore */
      }

      if (!cancelled) router.replace('/login');
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!allowed) {
    return (
      <div className="session-check">
        <span className="session-check-spinner" />
        <span className="session-check-text">Checking session…</span>
      </div>
    );
  }

  return <>{children}</>;
}
