'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ShieldAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { api, type Submission } from '../../services/api';
import { Empty, Outcome, PageHeader } from '../../components/ui';

export default function HistoryPage() {
  const [rows, setRows] = useState<Submission[] | null>(null);
  const [open, setOpen] = useState<Submission | null>(null);

  useEffect(() => {
    api.submissions().then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <>
      <PageHeader
        title="My submissions"
        lede="Everything you have run so far, newest first."
      />

      {rows === null && <div className="card-static p-8 text-ink-mute text-sm">Loading…</div>}
      {rows?.length === 0 && (
        <Empty title="Nothing here yet"
               body="Once you run a problem in Practice, your attempts will show up here." />
      )}

      {rows && rows.length > 0 && (
        <div className="card-static overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Problem</th>
                  <th className="th">Tests passed</th>
                  <th className="th">Score</th>
                  <th className="th">Result</th>
                  <th className="th">Time</th>
                  <th className="th">When</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const pct = s.visibleTotal > 0
                    ? Math.round((s.visiblePassed / s.visibleTotal) * 100) : 0;
                  return (
                    <tr key={s._id} className="hover:bg-brand-50/40 transition-colors">
                      <td className="td font-mono text-[13px] font-medium">{s.problemSlug}</td>
                      <td className="td">
                        <div className="flex items-center gap-2.5">
                          <span className="tabular-nums font-semibold">
                            {s.visiblePassed}/{s.visibleTotal}
                          </span>
                          <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-full rounded-full ${
                              pct === 100 ? 'bg-mint-500' : pct > 0 ? 'bg-sun-500' : 'bg-coral-500'
                            }`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="td tabular-nums font-semibold">{pct}%</td>
                      <td className="td">
                        <Outcome status={s.status} passed={s.visiblePassed} total={s.visibleTotal} />
                      </td>
                      <td className="td tabular-nums text-ink-soft">{s.runtimeMs} ms</td>
                      <td className="td text-ink-mute text-[13px]">
                        {new Date(s.createdAt).toLocaleString()}
                      </td>
                      <td className="td">
                        <button className="btn-ghost !py-1.5 !px-3 text-xs"
                                onClick={() => setOpen(s)}>
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(null)}
              className="fixed inset-0 bg-ink/25 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
              className="fixed right-0 top-0 bottom-0 w-[440px] max-w-[92vw] z-50
                         bg-card border-l border-line overflow-y-auto shadow-lift"
            >
              <div className="h-16 px-6 flex items-center border-b border-line">
                <div className="font-bold text-ink">Attempt details</div>
                <button onClick={() => setOpen(null)}
                        className="ml-auto text-ink-mute hover:text-ink transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[14px] font-semibold text-ink">
                    {open.problemSlug}
                  </span>
                  <Outcome status={open.status} passed={open.visiblePassed} total={open.visibleTotal} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="stat-label">Tests passed</div>
                    <div className="text-xl font-bold tabular-nums text-ink">
                      {open.visiblePassed}/{open.visibleTotal}
                    </div>
                  </div>
                  <div>
                    <div className="stat-label">Time taken</div>
                    <div className="text-xl font-bold tabular-nums text-ink">{open.runtimeMs} ms</div>
                  </div>
                </div>

                {open.injectionFlagged && (
                  <div className="text-[13px] text-coral-700 bg-coral-50 border border-coral-500/25
                                  rounded-xl px-3.5 py-2.5 flex items-start gap-2 leading-relaxed">
                    <ShieldAlert size={15} className="mt-0.5 shrink-0" />
                    This submission contained text aimed at the AI rather than code.
                    It was ignored and flagged for your teacher.
                  </div>
                )}

                <div className="text-[14px] text-ink leading-relaxed">
                  {open.visibleTotal > 0 && open.visiblePassed === open.visibleTotal
                    ? 'All sample tests passed. Try an empty input and a single-item input yourself — those are the cases that usually catch people out.'
                    : 'Some tests did not pass. Take the first failing case, work through that exact input by hand, and find the first step where your answer differs.'}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
