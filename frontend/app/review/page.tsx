'use client';

import { Check, History, Pencil, ShieldAlert, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { api, type HistoryRow, type QueueRow } from '../../services/api';
import { Empty, PageHeader, StateBadge } from '../../components/ui';

export default function ReviewPage() {
  const [rows, setRows] = useState<QueueRow[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const [hist, setHist] = useState<HistoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    api.queue().then(setRows).catch(() => setRows([]));
  }, []);
  useEffect(refresh, [refresh]);

  const open = (r: QueueRow) => {
    setOpenId(r._id);
    setDraft(r.content);
    setNote('');
    setError(null);
    api.history(r._id).then(setHist).catch(() => setHist([]));
  };

  const act = async (r: QueueRow, action: 'approve' | 'reject' | 'edit') => {
    setBusy(true);
    setError(null);
    try {
      await api.act(r._id, action, {
        expectedVersion: r.version,
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(action === 'edit' ? { content: draft } : {}),
      });
      setOpenId(null);
      refresh();
    } catch (e) {
      const ex = e as Error & { status?: number };
      setError(
        ex.status === 409
          ? 'Someone else updated this while you had it open. We have refreshed the list — please take another look.'
          : ex.status === 422
            ? 'That action is not available for this answer any more.'
            : ex.message,
      );
      refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Review queue"
        lede="Answers waiting for your approval. The most pressing questions are shown first."
      />

      {rows === null && <div className="card-static p-8 text-ink-mute text-sm">Loading…</div>}
      {rows?.length === 0 && (
        <Empty title="All caught up"
               body="Nothing is waiting for you right now. New questions will appear here automatically." />
      )}

      <div className="space-y-4 max-w-4xl">
        {rows?.map((r) => (
          <article key={r._id} className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center gap-3">
              <h3 className="text-[15px] font-bold text-ink min-w-0 truncate">
                {r.doubt?.title ?? 'Question'}
              </h3>
              <div className="ml-auto shrink-0 flex items-center gap-2">
                {r.llm?.injectionFlagged && (
                  <span className="badge-rejected"><ShieldAlert size={11} /> check carefully</span>
                )}
                {r.triage?.urgency && r.triage.urgency !== 'medium' && (
                  <span className={r.triage.urgency === 'high' ? 'badge-rejected' : 'badge-draft'}>
                    {r.triage.urgency === 'high' ? 'Urgent' : 'Low priority'}
                  </span>
                )}
                <StateBadge state={r.state} />
              </div>
            </div>

            <div className="p-5">
              <p className="text-[13.5px] text-ink-soft leading-relaxed mb-4">{r.doubt?.body}</p>

              {r.llm?.injectionFlagged && (
                <div className="text-[13px] text-coral-700 bg-coral-50 border border-coral-500/25
                                rounded-xl px-3.5 py-2.5 mb-4 leading-relaxed">
                  <span className="font-bold">Worth a closer read.</span> This question
                  contained text trying to instruct the AI rather than ask something.
                  We ignored it, but please check the draft carefully.
                </div>
              )}

              {openId === r._id ? (
                <div className="space-y-4">
                  <div>
                    <label className="label">Draft answer — edit it if you want to</label>
                    <textarea className="field min-h-[150px] resize-y" value={draft}
                              onChange={(e) => setDraft(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Reason (needed if you reject)</label>
                    <input className="field" value={note} onChange={(e) => setNote(e.target.value)}
                           placeholder="Why is this not right?" />
                  </div>

                  {error && (
                    <p className="text-[13px] text-coral-700 bg-coral-50 border border-coral-500/25
                                  rounded-xl px-3.5 py-2.5 leading-relaxed">{error}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button className="btn-primary" disabled={busy} onClick={() => void act(r, 'approve')}>
                      <Check size={15} /> Approve &amp; publish
                    </button>
                    <button className="btn-ghost" disabled={busy} onClick={() => void act(r, 'edit')}>
                      <Pencil size={15} /> Save changes
                    </button>
                    <button className="btn-danger" disabled={busy || !note.trim()}
                            onClick={() => void act(r, 'reject')}>
                      <X size={15} /> Reject
                    </button>
                    <button className="btn-ghost" onClick={() => setOpenId(null)}>Cancel</button>
                  </div>

                  {hist.length > 0 && (
                    <div className="border-t border-line pt-4">
                      <div className="text-[11.5px] font-bold text-ink-mute mb-2 flex items-center
                                      gap-1.5 uppercase tracking-wider">
                        <History size={12} /> Activity
                      </div>
                      <div className="space-y-1">
                        {hist.map((h, i) => (
                          <div key={i} className="text-[12.5px] text-ink-soft">
                            {h.action === 'submit_for_review' ? 'Draft created'
                              : h.action === 'approve' ? 'Approved and published'
                              : h.action === 'reject' ? 'Rejected'
                              : h.action === 'edit' ? 'Edited by teacher' : h.action}
                            {h.note ? ` — "${h.note}"` : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="bg-sun-50 border border-sun-500/20 rounded-xl p-4 mb-4">
                    <div className="text-[11.5px] font-bold text-sun-700 mb-1.5 uppercase tracking-wider">
                      Suggested answer
                    </div>
                    <p className="text-[14px] text-ink leading-relaxed">{r.content}</p>
                  </div>
                  <button className="btn-ghost" onClick={() => open(r)}>Review this</button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
