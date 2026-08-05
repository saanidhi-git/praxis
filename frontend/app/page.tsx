'use client';

import {
  CheckCircle2, Clock, Code2, MessageCircleQuestion, ShieldAlert, TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { api, type DoubtRow, type Submission } from '../services/api';
import { Empty, Outcome, PageHeader, StatCard, StateBadge } from '../components/ui';

export default function Dashboard() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<Submission[]>([]);
  const [doubts, setDoubts] = useState<DoubtRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.submissions().catch(() => [] as Submission[]),
      api.doubts().catch(() => [] as DoubtRow[]),
    ]).then(([s, d]) => {
      setSubs(s);
      setDoubts(d);
      setLoading(false);
    });
  }, []);

  const attempted = subs.length;
  const solved = subs.filter((s) => s.visibleTotal > 0 && s.visiblePassed === s.visibleTotal).length;
  const flagged =
    subs.filter((s) => s.injectionFlagged).length +
    doubts.filter((d) => d.injectionFlagged).length;
  const awaiting = doubts.filter((d) => !d.answer || d.answer.state !== 'approved').length;

  const passRate = attempted > 0
    ? Math.round(
        (subs.reduce((a, s) => a + (s.visibleTotal ? s.visiblePassed / s.visibleTotal : 0), 0) /
          attempted) * 100,
      )
    : 0;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.name ?? ''}`}
        lede={
          user?.role === 'teacher'
            ? 'Questions from your class are waiting for you in the review queue.'
            : 'Practise on real problems and ask a question whenever you get stuck.'
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Attempts" value={attempted} icon={Code2}
                  hint="Problems you have tried" />
        <StatCard label="Solved" value={solved} icon={CheckCircle2} tone="good"
                  hint="Every test case passed" />
        <StatCard label="Average score" value={`${passRate}%`} icon={TrendingUp}
                  hint="Across all your attempts" />
        <StatCard label="Filtered" value={flagged} icon={ShieldAlert}
                  tone={flagged > 0 ? 'bad' : 'default'}
                  hint="Unsafe text we blocked" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-ink">Recent submissions</h2>
            <Link href="/history"
                  className="text-[13px] font-semibold text-brand-600 hover:text-brand-700">
              View all
            </Link>
          </div>
          {loading ? (
            <div className="card-static p-6 text-ink-mute text-sm">Loading…</div>
          ) : subs.length === 0 ? (
            <Empty title="No attempts yet"
                   body="Head to Practice to try your first problem." />
          ) : (
            <div className="card-static overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">Problem</th>
                    <th className="th">Tests</th>
                    <th className="th">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.slice(0, 5).map((s) => (
                    <tr key={s._id} className="hover:bg-brand-50/50 transition-colors">
                      <td className="td font-mono text-[12.5px]">{s.problemSlug}</td>
                      <td className="td tabular-nums">{s.visiblePassed}/{s.visibleTotal}</td>
                      <td className="td">
                        <Outcome status={s.status} passed={s.visiblePassed} total={s.visibleTotal} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-ink">
              {user?.role === 'teacher' ? 'Needs your review' : 'Doubt board'}
            </h2>
            <Link
              href={user?.role === 'teacher' ? '/review' : '/doubts'}
              className="text-[13px] font-semibold text-brand-600 hover:text-brand-700"
            >
              {user?.role === 'teacher' ? `${awaiting} waiting` : 'View board'}
            </Link>
          </div>
          {loading ? (
            <div className="card-static p-6 text-ink-mute text-sm">Loading…</div>
          ) : doubts.length === 0 ? (
            <Empty title="No questions yet"
                   body="Questions from your class will show up here." />
          ) : (
            <div className="space-y-2.5">
              {doubts.slice(0, 4).map((d) => (
                <div key={d._id} className="card p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink truncate">{d.title}</div>
                      <div className="text-[12px] text-slate-500 truncate mt-0.5">{d.body}</div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {d.injectionFlagged && <ShieldAlert size={14} className="text-rose-400" />}
                      {d.answer
                        ? <StateBadge state={d.answer.state} />
                        : <span className="badge-pending"><Clock size={10} /> awaiting</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="card-static p-5 mt-8 flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-brand-50 grid place-items-center shrink-0">
          <MessageCircleQuestion size={17} className="text-brand-600" />
        </div>
        <p className="text-[13.5px] text-ink-soft leading-relaxed">
          <span className="text-ink font-bold">Tip.</span>{' '}
          The sample tests you see are only part of the picture — your final mark
          also checks tricky cases like empty inputs and duplicates. Passing
          everything here is a great sign, but it is worth testing those yourself too.
        </p>
      </div>
    </>
  );
}
