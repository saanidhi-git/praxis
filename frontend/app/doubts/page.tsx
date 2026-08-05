'use client';

import { Clock, Loader2, Send, ShieldAlert } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../context/AuthContext';
import { api, type DoubtRow, type Signal } from '../../services/api';
import { Empty, Flag, PageHeader, StateBadge } from '../../components/ui';

export default function DoubtBoardPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<DoubtRow[] | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ flagged: boolean; signals: Signal[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    api.doubts().then(setRows).catch(() => setRows([]));
  }, []);
  useEffect(refresh, [refresh]);

  const post = async () => {
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.postDoubt(title, body);
      setLast({ flagged: res.injectionFlagged, signals: res.injectionSignals });
      setTitle('');
      setBody('');
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Doubt board"
        lede={
          user?.role === 'teacher'
            ? 'Questions from your class. Drafts waiting on you are marked clearly.'
            : 'Ask anything you are stuck on. Answers appear once your teacher has approved them.'
        }
      />

      {user?.role === 'student' && (
        <div className="card-static p-6 mb-8 max-w-3xl">
          <div className="space-y-4">
            <div>
              <label className="label">What is your question?</label>
              <input className="field" value={title} onChange={(e) => setTitle(e.target.value)}
                     placeholder="Why does my recursion keep crashing?" />
            </div>
            <div>
              <label className="label">Tell us more</label>
              <textarea className="field min-h-[110px] resize-y" value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="What did you try, and what happened? Paste the error if you have one." />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button className="btn-primary" disabled={busy || !title.trim() || !body.trim()}
                      onClick={() => void post()}>
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {busy ? 'Sending…' : 'Ask question'}
              </button>
              <span className="text-[12.5px] text-ink-mute">
                Your teacher will review the answer before the class sees it.
              </span>
            </div>

            {error && <p className="text-[13px] text-coral-600">{error}</p>}

            {last && (
              last.flagged
                ? <Flag signals={last.signals.map((s) => s.rule)} />
                : <p className="text-[13px] text-mint-700 bg-mint-50 border border-mint-500/25
                                rounded-xl px-3.5 py-2.5">
                    Sent. Your teacher will take a look shortly.
                  </p>
            )}
          </div>
        </div>
      )}

      {rows === null && <div className="card-static p-8 text-ink-mute text-sm">Loading…</div>}
      {rows?.length === 0 && (
        <Empty title="No questions yet"
               body="Be the first to ask — questions from your class will appear here." />
      )}

      <div className="space-y-4 max-w-4xl">
        {rows?.map((d) => (
          <article key={d._id} className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center gap-3">
              <h3 className="text-[15px] font-bold text-ink min-w-0 truncate">{d.title}</h3>
              <div className="ml-auto shrink-0 flex items-center gap-2">
                {d.injectionFlagged && (
                  <span className="badge-rejected"><ShieldAlert size={11} /> filtered</span>
                )}
                {d.answer
                  ? <StateBadge state={d.answer.state} />
                  : <span className="badge-pending"><Clock size={11} /> Waiting for teacher</span>}
              </div>
            </div>

            <div className="p-5">
              <p className="text-[14px] text-ink-soft leading-relaxed mb-4">{d.body}</p>

              {d.answer && d.answer.state === 'approved' ? (
                <div className="bg-mint-50 border border-mint-500/20 rounded-xl p-4">
                  <div className="text-[11.5px] font-bold text-mint-700 mb-1.5 uppercase tracking-wider">
                    Approved by your teacher
                  </div>
                  <p className="text-[14px] text-ink leading-relaxed">{d.answer.content}</p>
                </div>
              ) : d.answer && user?.role === 'teacher' ? (
                <div className="bg-sun-50 border border-sun-500/20 rounded-xl p-4">
                  <div className="text-[11.5px] font-bold text-sun-700 mb-1.5 uppercase tracking-wider">
                    Draft — students cannot see this yet
                  </div>
                  <p className="text-[14px] text-ink leading-relaxed">{d.answer.content}</p>
                </div>
              ) : (
                <p className="text-[13px] text-ink-mute leading-relaxed">
                  An answer is being prepared and is with your teacher for checking.
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
