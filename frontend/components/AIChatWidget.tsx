'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Send, ShieldAlert, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { api } from '../services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  flagged?: boolean;
}

const OPENERS = [
  'Explain the two-sum approach',
  'Why does my loop skip the last item?',
  'What is Big-O, simply?',
];

export function PraxisAI() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "Hi, I'm PraxisAI. Ask me about a concept, an error message, or a test that " +
        "won't pass — I'll walk you through it.",
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: 'user', content: question }]);
    setInput('');
    setBusy(true);

    try {
      const reply = await api.chat(question, history);
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: reply.content, flagged: reply.flagged },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content:
            "I couldn't reach the server just then. Check your connection and try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)]
                       h-[520px] max-h-[calc(100vh-8rem)] bg-card border border-line
                       rounded-2xl shadow-lift flex flex-col overflow-hidden"
          >
            <div className="h-14 shrink-0 px-4 flex items-center gap-2.5
                            bg-gradient-to-r from-brand-500 to-brand-600">
              <div className="w-8 h-8 rounded-xl bg-white/20 grid place-items-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-bold text-white">PraxisAI</div>
                <div className="text-[11px] text-white/80">Your study buddy</div>
              </div>
              <button onClick={() => setOpen(false)}
                      className="ml-auto text-white/80 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-canvas">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[86%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-2xl rounded-br-md'
                      : m.flagged
                        ? 'bg-coral-50 border border-coral-500/25 text-coral-700 rounded-2xl rounded-bl-md'
                        : 'bg-white border border-line text-ink rounded-2xl rounded-bl-md shadow-soft'
                  }`}>
                    {m.flagged && (
                      <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold">
                        <ShieldAlert size={12} /> Ignored an unsafe instruction
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </div>
                </div>
              ))}

              {messages.length === 1 && !busy && (
                <div className="space-y-1.5 pt-1">
                  {OPENERS.map((s) => (
                    <button key={s} onClick={() => void send(s)}
                      className="block w-full text-left text-[12.5px] px-3 py-2 rounded-xl
                                 bg-white border border-line text-ink-soft
                                 hover:border-brand-200 hover:text-brand-600
                                 transition-all duration-200">
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {busy && (
                <div className="flex items-center gap-2 text-[12.5px] text-ink-mute px-1">
                  <Loader2 size={13} className="animate-spin" /> thinking…
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="p-3 border-t border-line flex gap-2 bg-card">
              <input
                className="field !py-2"
                placeholder="Ask anything…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void send(input); }}
                disabled={busy}
              />
              <button className="btn-primary !px-3" onClick={() => void send(input)}
                      disabled={busy || !input.trim()}>
                <Send size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl
                   bg-gradient-to-br from-brand-500 to-brand-600
                   grid place-items-center shadow-lift"
        aria-label="Open PraxisAI"
      >
        {open
          ? <X size={22} className="text-white" />
          : <Sparkles size={22} className="text-white" />}
      </motion.button>
    </>
  );
}
