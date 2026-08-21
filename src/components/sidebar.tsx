'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Database,
  Fuel,
  PlugZap,
  Leaf,
  Sun,
} from 'lucide-react';

const scope1Links = [
  { href: '/data/scope-1/lpg-14kg', label: 'LPG 14kg' },
  { href: '/data/scope-1/lpg-50kg', label: 'LPG 50kg' },
  { href: '/data/scope-1/diesel', label: 'Diesel' },
  { href: '/data/scope-1/petrol', label: 'Petrol' },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/'
      ? pathname === '/'
      : pathname.startsWith(href);

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-chip">
          <Leaf size={18} strokeWidth={2.5} />
        </span>

        <span>
          GHG Carbon Footprint
          <small>Scope 1 &amp; Scope 2 Management</small>
        </span>
      </div>

      <nav className="nav">
        <div className="nav-title">Overview</div>

        <Link
          href="/"
          className={isActive('/') ? 'active' : ''}
        >
          <LayoutDashboard size={16} />
          Dashboard
        </Link>

        <Link
          href="/emission-factors"
          className={
            isActive('/emission-factors') ? 'active' : ''
          }
        >
          <Database size={16} />
          Emission Factors
        </Link>

        <div className="nav-title">Scope 1</div>

        {scope1Links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              isActive(link.href) ? 'active' : ''
            }
          >
            <Fuel size={16} />
            {link.label}
          </Link>
        ))}

        <div className="nav-title">Scope 2</div>

        <Link
          href="/data/scope-2/electricity"
          className={
            isActive('/data/scope-2/electricity')
              ? 'active'
              : ''
          }
        >
          <PlugZap size={16} />
          Electricity
        </Link>

        <Link
          href="/data/scope-2/solar"
          className={
            isActive('/data/scope-2/solar')
              ? 'active'
              : ''
          }
        >
          <Sun size={16} />
          Solar
        </Link>
      </nav>

      <div className="sidebar-foot">
        <span className="status-dot" />
        Neon PostgreSQL · Connected
      </div>
    </aside>
  );
}
