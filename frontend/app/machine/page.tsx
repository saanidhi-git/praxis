'use client';

import { CheckCircle2, PenLine, Send, ShieldCheck } from 'lucide-react';

import { PageHeader } from '../../components/ui';

const STEPS = [
  {
    icon: Send,
    title: 'You ask a question',
    body: 'Post it to the doubt board whenever you get stuck.',
    tone: 'brand',
  },
  {
    icon: PenLine,
    title: 'PraxisAI writes a draft',
    body: 'An answer is prepared straight away, but nobody sees it yet.',
    tone: 'brand',
  },
  {
    icon: ShieldCheck,
    title: 'Your teacher checks it',
    body: 'They can approve it, fix it first, or reject it if it is wrong.',
    tone: 'sun',
  },
  {
    icon: CheckCircle2,
    title: 'The class sees the answer',
    body: 'Only once your teacher has approved it.',
    tone: 'mint',
  },
];

export default function HowReviewWorksPage() {
  return (
    <>
      <PageHeader
        title="How review works"
        lede="Every answer on the doubt board is checked by a real teacher before anyone can read it."
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl">
        {STEPS.map(({ icon: Icon, title, body, tone }, i) => {
          const colour = {
            brand: 'bg-brand-50 text-brand-600',
            sun: 'bg-sun-50 text-sun-600',
            mint: 'bg-mint-50 text-mint-600',
          }[tone]!;
          return (
            <div key={title} className="card p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`w-10 h-10 rounded-xl grid place-items-center ${colour}`}>
                  <Icon size={19} />
                </div>
                <span className="text-[11px] font-bold text-ink-mute">STEP {i + 1}</span>
              </div>
              <div className="font-bold text-ink text-[14.5px] mb-1">{title}</div>
              <div className="text-[13px] text-ink-soft leading-relaxed">{body}</div>
            </div>
          );
        })}
      </div>

      <div className="card-static p-6 mt-6 max-w-5xl">
        <h2 className="font-bold text-ink text-[15px] mb-2">Why we do it this way</h2>
        <p className="text-[14px] text-ink-soft leading-relaxed max-w-[68ch]">
          AI is genuinely useful for explaining ideas quickly, but it can also be
          confidently wrong — and a wrong answer shared with a whole class does real
          damage. So Praxis treats every AI answer as a suggestion for your teacher,
          never as the final word. A teacher always makes the call.
        </p>
      </div>
    </>
  );
}
