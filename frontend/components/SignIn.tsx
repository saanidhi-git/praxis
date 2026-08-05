'use client';

import { BookOpenCheck, Loader2, MessagesSquare, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '../context/AuthContext';

type Mode = 'login' | 'register';

export function SignIn() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') await login(email.trim(), password);
      else await register(name.trim(), email.trim(), password, role);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const useDemo = (as: 'student' | 'teacher') => {
    setMode('login');
    setEmail(`${as}@praxis.app`);
    setPassword('praxis123');
    setError(null);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-6 py-10">
      {/* Soft colour wash — CSS only, so nothing to load and nothing to break
          on a deploy with a strict asset policy. */}
      <div className="aurora w-[520px] h-[520px] -top-32 -left-24 bg-brand-200" />
      <div className="aurora w-[460px] h-[460px] top-1/3 -right-24 bg-sky-50 animate-float"
           style={{ background: '#bae6fd' }} />
      <div className="aurora w-[380px] h-[380px] -bottom-24 left-1/4"
           style={{ background: '#fbcfe8' }} />

      <div className="relative w-full max-w-5xl grid lg:grid-cols-2 gap-10 items-center">
        {/* ---------------- pitch ---------------- */}
        <div className="animate-slide-up">
          <div className="flex items-center gap-3 mb-7">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600
                            grid place-items-center shadow-lift">
              <BookOpenCheck size={24} className="text-white" />
            </div>
            <div>
              <div className="text-2xl font-extrabold tracking-tight text-ink">Praxis</div>
              <div className="text-[13px] text-ink-soft font-medium">
                Practice code. Get answers you can trust.
              </div>
            </div>
          </div>

          <h1 className="text-[34px] leading-[1.15] font-extrabold tracking-tight text-ink mb-4">
            Write code, run the tests,
            <br />
            <span className="bg-gradient-to-r from-brand-500 via-brand-600 to-sky-500
                             bg-clip-text text-transparent">
              and never get a wrong answer
            </span>
          </h1>

          <p className="text-[15px] text-ink-soft leading-relaxed mb-8 max-w-md">
            Practise on real problems with instant test feedback. Ask a question and
            get help fast — every answer is checked by your teacher before it reaches
            the class.
          </p>

          <div className="space-y-3.5">
            {[
              { icon: Sparkles, title: 'Instant test feedback',
                body: 'Run your solution and see exactly which cases pass.' },
              { icon: MessagesSquare, title: 'Ask anything, anytime',
                body: 'PraxisAI explains concepts and helps you find the bug.' },
              { icon: ShieldCheck, title: 'Teacher-approved answers',
                body: 'Nothing reaches the class until a teacher signs off.' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-line grid
                                place-items-center shrink-0 shadow-soft">
                  <Icon size={17} className="text-brand-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink">{title}</div>
                  <div className="text-[13px] text-ink-soft">{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ---------------- form ---------------- */}
        <div className="card-static p-7 animate-slide-up">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === m ? 'bg-white text-brand-600 shadow-soft' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="label">Your name</label>
                <input className="field" value={name} required
                       onChange={(e) => setName(e.target.value)} placeholder="Saanidhi Gade" />
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <input className="field" type="email" value={email} required
                     onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" />
            </div>

            <div>
              <label className="label">Password</label>
              <input className="field" type="password" value={password} required minLength={8}
                     onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
            </div>

            {mode === 'register' && (
              <div>
                <label className="label">I am a</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['student', 'teacher'] as const).map((r) => (
                    <button key={r} type="button" onClick={() => setRole(r)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                        role === r
                          ? 'bg-brand-50 border-brand-400 text-brand-700'
                          : 'bg-white border-line text-ink-soft hover:border-brand-200'
                      }`}>
                      {r === 'student' ? 'Student' : 'Teacher'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="text-[13px] text-coral-600 bg-coral-50 border border-coral-500/20
                            rounded-xl px-3 py-2">{error}</p>
            )}

            <button className="btn-primary w-full !py-2.5" disabled={busy}>
              {busy && <Loader2 size={16} className="animate-spin" />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-line">
            <div className="text-[12px] text-ink-mute mb-2.5 text-center font-medium">
              Try it instantly
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-ghost !py-2 text-xs" onClick={() => useDemo('student')}>
                Demo student
              </button>
              <button className="btn-ghost !py-2 text-xs" onClick={() => useDemo('teacher')}>
                Demo teacher
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
