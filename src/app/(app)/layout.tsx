import { Sidebar } from '@/components/sidebar';
import { SessionGuard } from '@/components/session-guard';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="shell">
      <SessionGuard>
        <Sidebar />
        <main className="main">{children}</main>
      </SessionGuard>
    </div>
  );
}
