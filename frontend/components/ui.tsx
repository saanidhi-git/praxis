'use client';

import type { LucideIcon } from 'lucide-react';

export function PageHeader({ title, lede }: { title: string; lede?: string }) {
  return (
    <div className="mb-7">
      <h1 className="text-[26px] font-extrabold text-ink tracking-tight">{title}</h1>
      {lede && <p className="text-[14px] text-ink-soft mt-1 max-w-[64ch] leading-relaxed">{lede}</p>}
    </div>
  );
}

export function StatCard({
  label, value, hint, icon: Icon, tone = 'default',
}: {
  label: string; value: string | number; hint?: string;
  icon?: LucideIcon; tone?: 'default' | 'good' | 'warn' | 'bad';
}) {
  const toneClass = {
    default: 'text-ink',
    good: 'text-mint-600',
    warn: 'text-sun-600',
    bad: 'text-coral-600',
  }[tone];
  const iconBg = {
    default: 'bg-brand-50 text-brand-600',
    good: 'bg-mint-50 text-mint-600',
    warn: 'bg-sun-50 text-sun-600',
    bad: 'bg-coral-50 text-coral-600',
  }[tone];

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-2">
        <span className="stat-label">{label}</span>
        {Icon && (
          <div className={`w-8 h-8 rounded-xl grid place-items-center ${iconBg}`}>
            <Icon size={15} />
          </div>
        )}
      </div>
      <div className={`stat-value ${toneClass}`}>{value}</div>
      {hint && <div className="text-[12px] text-ink-mute mt-1 leading-relaxed">{hint}</div>}
    </div>
  );
}

export function outcomeOf(status: string, passed: number, total: number) {
  if (status === 'timeout') return { label: 'Too slow', cls: 'badge-pending' } as const;
  if (status === 'error') return { label: "Didn't run", cls: 'badge-rejected' } as const;
  if (total > 0 && passed === total) return { label: 'Passed', cls: 'badge-approved' } as const;
  if (passed > 0) return { label: 'Partly passed', cls: 'badge-pending' } as const;
  return { label: 'Failed', cls: 'badge-rejected' } as const;
}

export function Outcome({ status, passed, total }: { status: string; passed: number; total: number }) {
  const o = outcomeOf(status, passed, total);
  return <span className={o.cls}>{o.label}</span>;
}

export function StateBadge({ state }: { state: string }) {
  const label = {
    approved: 'Published',
    pending: 'Waiting for teacher',
    rejected: 'Not published',
    draft: 'Draft',
    superseded: 'Replaced',
  }[state] ?? state;

  const cls =
    state === 'approved' ? 'badge-approved'
    : state === 'pending' ? 'badge-pending'
    : state === 'rejected' ? 'badge-rejected'
    : state === 'superseded' ? 'badge-superseded'
    : 'badge-draft';

  return <span className={cls}>{label}</span>;
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="card-static py-16 px-6 text-center">
      <div className="text-ink font-bold text-[15px]">{title}</div>
      <div className="text-ink-soft text-[13.5px] mt-1.5 max-w-[44ch] mx-auto leading-relaxed">
        {body}
      </div>
    </div>
  );
}

export function Flag({ signals }: { signals: string[] }) {
  if (signals.length === 0) return null;
  return (
    <div className="text-[13px] text-coral-700 bg-coral-50 border border-coral-500/25
                    rounded-xl px-3.5 py-2.5 leading-relaxed">
      <span className="font-bold">Heads up.</span> This text tries to give the AI
      instructions rather than ask a question. We ignored those instructions — your
      question still went to your teacher as normal.
    </div>
  );
}
