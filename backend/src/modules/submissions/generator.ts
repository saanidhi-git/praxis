
import { randomBytes } from 'node:crypto';

import { env, isMockLLM } from '../../config/env.js';
import { logger } from '../../core/logger.js';
import { getExecutor } from './executor.js';
import type { Difficulty, Problem } from './problems.js';

interface Draft {
  title: string;
  prompt: string;
  topic: string;
  starter: string;
  reference: string;
  visibleTests: string[];
  hiddenTests: string[];
}

const SYSTEM = `
You write short programming exercises for an introductory Python course.

Return ONLY a JSON object with exactly these keys:
{
  "title": short human title,
  "prompt": one or two sentences describing the task,
  "topic": one of Arrays, Strings, Math, Logic, Recursion, Dictionaries, Searching, Stacks,
  "starter": a Python stub defining "def solve(...)" with a placeholder return,
  "reference": a COMPLETE correct Python implementation of "def solve(...)",
  "visibleTests": array of 2 assert statements,
  "hiddenTests": array of 3 assert statements covering edge cases
}

Rules:
- The function MUST be named solve.
- Every assert must call solve(...) and must pass against your reference.
- Use only the standard library. No imports beyond builtins.
- Hidden tests must cover edge cases the visible ones skip: empty input,
  single element, zero, negatives, duplicates.
- Keep the reference under 15 lines.
`.trim();

async function askModel(difficulty: Difficulty, topic?: string): Promise<Draft | null> {
  const ask =
    `Write one ${difficulty} problem` +
    (topic ? ` about ${topic}.` : '.') +
    ' Make it different from Two Sum and FizzBuzz.';

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.GROQ_TEXT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: ask },
      ],
      temperature: 0.9, // variety matters more than determinism here
      max_tokens: 900,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    logger.warn({ status: res.status }, 'problem generator: model call failed');
    return null;
  }

  const payload = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  try {
    return JSON.parse(payload.choices[0]?.message.content ?? '{}') as Draft;
  } catch {
    return null;
  }
}

function shapeIsValid(d: Draft | null): d is Draft {
  return Boolean(
    d &&
    typeof d.title === 'string' && d.title.length > 2 &&
    typeof d.prompt === 'string' && d.prompt.length > 10 &&
    typeof d.reference === 'string' && d.reference.includes('def solve') &&
    typeof d.starter === 'string' && d.starter.includes('def solve') &&
    Array.isArray(d.visibleTests) && d.visibleTests.length >= 1 &&
    Array.isArray(d.hiddenTests) && d.hiddenTests.length >= 1 &&
    [...d.visibleTests, ...d.hiddenTests].every(
      (t) => typeof t === 'string' && t.includes('solve('),
    ),
  );
}

async function verify(draft: Draft): Promise<boolean> {
  const tests = [...draft.visibleTests, ...draft.hiddenTests];
  const result = await getExecutor().run({ source: draft.reference, tests, timeoutMs: 6000 });

  const ok = result.status === 'ok' && result.passed === tests.length;
  if (!ok) {
    logger.info(
      { title: draft.title, passed: result.passed, total: tests.length, status: result.status },
      'problem generator: draft failed self-verification, discarded',
    );
  }
  return ok;
}

export async function generateProblem(
  difficulty: Difficulty,
  topic?: string,
): Promise<Problem | null> {
  if (isMockLLM) return null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const draft = await askModel(difficulty, topic);
    if (!shapeIsValid(draft)) continue;
    if (!(await verify(draft))) continue;

    return {
      slug: `gen_${randomBytes(4).toString('hex')}`,
      title: draft.title,
      prompt: draft.prompt,
      difficulty,
      topic: draft.topic || topic || 'Mixed',
      starter: draft.starter,
      visibleTests: draft.visibleTests,
      hiddenTests: draft.hiddenTests,
      generated: true,
    };
  }

  return null;
}
