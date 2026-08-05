'use client';

import Editor from '@monaco-editor/react';
import { AlertTriangle, Loader2, Play, Search, Sparkles, Terminal, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { api, type Execution, type Problem, type Signal } from '../../services/api';
import { Flag, Outcome, PageHeader } from '../../components/ui';

type Pane = 'output' | 'feedback';
type Difficulty = 'easy' | 'medium' | 'hard';

const DIFF_STYLE: Record<Difficulty, string> = {
  easy: 'badge-approved',
  medium: 'badge-pending',
  hard: 'badge-rejected',
};

export default function PracticePage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [slug, setSlug] = useState('');
  const [source, setSource] = useState('');
  const [query, setQuery] = useState('');
  const [diffFilter, setDiffFilter] = useState<Difficulty | 'all'>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');

  const [running, setRunning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{
    execution: Execution; injectionFlagged: boolean; injectionSignals: Signal[];
  } | null>(null);
  const [pane, setPane] = useState<Pane>('output');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.problems().then((d) => {
      setProblems(d.problems);
      setTopics(d.topics);
      const first = d.problems[0];
      if (first) { setSlug(first.slug); setSource(first.starter); }
    }).catch(() => setProblems([]));
  }, []);

  const problem = problems.find((p) => p.slug === slug);

  const filtered = useMemo(() => problems.filter((p) => {
    if (diffFilter !== 'all' && p.difficulty !== diffFilter) return false;
    if (topicFilter !== 'all' && p.topic !== topicFilter) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.topic.toLowerCase().includes(q);
    }
    return true;
  }), [problems, diffFilter, topicFilter, query]);

  const pick = (p: Problem) => {
    setSlug(p.slug);
    setSource(p.starter);
    setResult(null);
    setError(null);
  };

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const p = await api.generateProblem(
        diffFilter === 'all' ? 'medium' : diffFilter,
        topicFilter === 'all' ? undefined : topicFilter,
      );
      setProblems((prev) => [p, ...prev]);
      pick(p);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await api.submit(slug, source);
      setResult(res);
      setPane('output');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const pct = result && result.execution.total > 0
    ? Math.round((result.execution.passed / result.execution.total) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Practice"
        lede={`${problems.length} problems to work through — or generate a brand new one.`}
      />

      {/* ---------------- picker ---------------- */}
      <div className="card-static p-4 mb-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" />
            <input className="field !pl-9" placeholder="Search problems…"
                   value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          <select className="field !w-auto" value={diffFilter}
                  onChange={(e) => setDiffFilter(e.target.value as Difficulty | 'all')}>
            <option value="all">All levels</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <select className="field !w-auto" value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}>
            <option value="all">All topics</option>
            {topics.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <button className="btn-primary" onClick={() => void generate()} disabled={generating}>
            {generating ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
            {generating ? 'Creating…' : 'New problem'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4 max-h-32 overflow-y-auto">
          {filtered.map((p) => (
            <button key={p.slug} onClick={() => pick(p)}
              className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium border
                          transition-all duration-200 ${
                p.slug === slug
                  ? 'bg-brand-500 border-brand-500 text-white'
                  : 'bg-white border-line text-ink-soft hover:border-brand-400 hover:text-brand-600'
              }`}>
              {p.title}
              {p.generated && <span className="ml-1.5 opacity-70">✦</span>}
            </button>
          ))}
          {filtered.length === 0 && (
            <span className="text-[13px] text-ink-mute py-1.5">
              Nothing matches those filters.
            </span>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        {/* ---------------- left ---------------- */}
        <div className="space-y-4">
          <div className="card-static p-5">
            <div className="flex items-center gap-2.5 mb-3 flex-wrap">
              <h2 className="text-[17px] font-bold text-ink">{problem?.title ?? '—'}</h2>
              {problem && <span className={DIFF_STYLE[problem.difficulty]}>{problem.difficulty}</span>}
              {problem && <span className="badge-draft">{problem.topic}</span>}
              {problem?.generated && <span className="badge-brand">AI-made</span>}
            </div>
            <p className="text-[14.5px] text-ink leading-relaxed">{problem?.prompt}</p>
          </div>

          <div className="card-static overflow-hidden">
            <div className="px-5 py-3 border-b border-line text-xs font-bold text-ink-soft
                            uppercase tracking-wider">
              Sample test cases
            </div>
            <div className="p-5 space-y-2">
              {problem?.visibleTests.map((t, i) => (
                <div key={i} className="font-mono text-[12.5px] text-ink-soft bg-canvas
                                        rounded-lg px-3 py-2 border border-line">{t}</div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-line text-[12.5px] text-ink-mute leading-relaxed">
              Your final mark also checks a few cases you cannot see, like empty
              inputs and duplicates.
            </div>
          </div>
        </div>

        {/* ---------------- right ---------------- */}
        <div className="space-y-4">
          <div className="card-static overflow-hidden">
            <div className="px-4 py-3 border-b border-line flex items-center gap-3">
              <span className="text-xs font-bold text-ink-soft uppercase tracking-wider">
                Your code
              </span>
              <span className="badge-brand">Python</span>
              <button className="btn-primary ml-auto !py-2" disabled={running || !source.trim()}
                      onClick={() => void run()}>
                {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                {running ? 'Running…' : 'Run tests'}
              </button>
            </div>
            <Editor
              height="360px"
              language="python"
              theme="light"
              value={source}
              onChange={(v) => setSource(v ?? '')}
              options={{
                fontSize: 13.5,
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 },
                lineNumbersMinChars: 3,
                automaticLayout: true,
                tabSize: 4,
              }}
            />
          </div>

          <div className="card-static overflow-hidden">
            <div className="border-b border-line flex">
              {(['output', 'feedback'] as Pane[]).map((p) => (
                <button key={p} onClick={() => setPane(p)}
                  className={`px-5 py-3 text-[13px] font-semibold transition-colors border-b-2 -mb-px ${
                    pane === p
                      ? 'text-brand-600 border-brand-500'
                      : 'text-ink-mute border-transparent hover:text-ink'
                  }`}>
                  <span className="inline-flex items-center gap-1.5">
                    {p === 'output' ? <Terminal size={14} /> : <Sparkles size={14} />}
                    {p === 'output' ? 'Results' : 'Tips'}
                  </span>
                </button>
              ))}
            </div>

            <div className="p-5">
              {error && (
                <div className="text-[13px] text-coral-700 bg-coral-50 border border-coral-500/25
                                rounded-xl px-3.5 py-2.5 flex items-start gap-2 leading-relaxed">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {error}
                </div>
              )}

              {!result && !error && (
                <div className="text-[13.5px] text-ink-mute py-8 text-center">
                  Run the tests to see your results here.
                </div>
              )}

              {result && pane === 'output' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-5">
                    <div className="text-4xl font-extrabold tabular-nums text-ink">
                      {result.execution.passed}
                      <span className="text-ink-mute text-2xl font-bold">
                        /{result.execution.total}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-canvas border border-line overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${
                          pct === 100 ? 'bg-mint-500' : pct > 0 ? 'bg-sun-500' : 'bg-coral-500'
                        }`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-[12px] text-ink-mute mt-2">
                        {pct}% of sample tests · {result.execution.runtimeMs} ms
                      </div>
                    </div>
                    <Outcome status={result.execution.status}
                             passed={result.execution.passed} total={result.execution.total} />
                  </div>

                  {result.execution.status === 'timeout' && (
                    <div className="text-[13px] text-sun-700 bg-sun-50 border border-sun-500/25
                                    rounded-xl px-3.5 py-2.5 leading-relaxed">
                      Your code took too long and was stopped. This usually means a loop
                      never finishes — check the loop variable actually changes.
                    </div>
                  )}

                  <Flag signals={result.injectionSignals.map((s) => s.rule)} />

                  {result.execution.stderr && (
                    <pre className="text-[12px] font-mono text-ink-soft bg-canvas border border-line
                                    rounded-xl p-3.5 overflow-x-auto whitespace-pre-wrap max-h-48">
                      {result.execution.stderr.slice(0, 1500)}
                    </pre>
                  )}
                </div>
              )}

              {result && pane === 'feedback' && (
                <div className="text-[14px] text-ink leading-relaxed">
                  {pct === 100
                    ? 'Nice work, all sample tests pass. Before moving on, try an empty input and a single-item input by hand — those are the cases that usually catch people out.'
                    : pct > 0
                      ? 'You are close. Take the first failing test, run that exact input in your head, and find the first step where your answer differs from the expected one.'
                      : 'Nothing passed yet. Check your function name and inputs match the starter code, and that every path returns a value.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
