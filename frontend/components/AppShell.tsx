'use client';

import {
  BookOpenCheck, ChevronLeft, Code2, LayoutDashboard,
  LogOut, MessageCircleQuestion, ScrollText, ShieldCheck, Workflow,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { PraxisAI } from './AIChatWidget';
import { SignIn } from './SignIn';

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  teacherOnly?: boolean;
}

const LINKS: NavLink[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/submit', label: 'Practice', icon: Code2 },
  { href: '/history', label: 'My submissions', icon: ScrollText },
  { href: '/doubts', label: 'Doubt board', icon: MessageCircleQuestion },
  { href: '/review', label: 'Review queue', icon: ShieldCheck, teacherOnly: true },
  { href: '/machine', label: 'How review works', icon: Workflow },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, ready, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  if (!ready) {
    return <div className="min-h-screen grid place-items-center text-ink-mute text-sm">Loading…</div>;
  }

  if (!user) return <SignIn />;

  const links = LINKS.filter((l) => !l.teacherOnly || user.role === 'teacher');
  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="min-h-screen flex">
      <aside className={`${collapsed ? 'w-[72px]' : 'w-[236px]'} shrink-0 border-r border-line
                         bg-white flex flex-col transition-all duration-200`}>
        <div className="h-16 flex items-center gap-2.5 px-4 border-b border-line">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600
                          grid place-items-center shrink-0 shadow-soft">
            <BookOpenCheck size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-extrabold text-ink leading-tight tracking-tight">Praxis</div>
              <div className="text-[10.5px] text-ink-mute leading-tight truncate">
                Practice code, get trusted answers
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} title={collapsed ? label : undefined}
                    className={`nav-item ${active ? 'nav-item-active' : ''}`}>
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-line">
          <button onClick={() => setCollapsed((c) => !c)} className="nav-item w-full">
            <ChevronLeft size={18}
              className={`shrink-0 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 shrink-0 border-b border-line bg-white flex items-center px-6 gap-4">
          <div className="text-[15px] font-bold text-ink tracking-tight">
            {links.find((l) => l.href === pathname)?.label ?? 'Praxis'}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className={user.role === 'teacher' ? 'badge-brand' : 'badge-draft'}>
              {user.role === 'teacher' ? 'Teacher' : 'Student'}
            </span>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-600
                              grid place-items-center text-white text-xs font-bold shrink-0">
                {initials}
              </div>
              <div className="text-sm font-semibold text-ink hidden sm:block">{user.name}</div>
            </div>
            <button onClick={logout} className="btn-ghost !px-2.5 !py-2" title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main className="flex-1 min-w-0 p-6 lg:p-8 max-w-[1400px] w-full">{children}</main>
      </div>

      <PraxisAI />
    </div>
  );
}
