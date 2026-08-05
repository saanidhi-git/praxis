
import { Router, type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { env, isMockLLM } from './config/env.js';
import { asyncRoute, forbidden, HttpError, notFound, unauthorized } from './core/errors.js';
import { chat } from './modules/ai/chat.service.js';
import { hashPassword, User, verifyPassword } from './modules/auth/user.model.js';
import { databaseReady } from './core/db.js';
import { draftAnswer, providerName } from './modules/ai/provider.js';
import { scanCode, scanForInjection } from './modules/ai/guards/injection-filter.js';
import { Doubt } from './modules/doubts/doubt.model.js';
import * as ml from './modules/ml-client/index.js';
import { Answer } from './modules/review/answer.model.js';
import * as repo from './modules/review/answer.repository.js';
import { toMarkdownTable, toMermaid, TRANSITIONS } from './modules/review/state-machine.js';
import { getExecutor } from './modules/submissions/executor.js';
import { Submission } from './modules/submissions/submission.model.js';
import { generateProblem } from './modules/submissions/generator.js';
import {
  allProblems, problemBySlug, registerGenerated, TOPICS, type Problem,
} from './modules/submissions/problems.js';

export const router = Router();

// --------------------------------------------------------------------------
// Auth
// --------------------------------------------------------------------------
interface Principal {
  id: string;
  name: string;
  role: 'student' | 'teacher';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: Principal;
    }
  }
}

function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  try {
    req.user = jwt.verify(header.slice(7), env.JWT_SECRET) as Principal;
  } catch {
  }
  next();
}

function requireRole(role: Principal['role']) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(unauthorized());
    if (req.user.role !== role) return next(forbidden(`Requires the ${role} role`));
    next();
  };
}

router.use(authenticate);

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

function issueToken(user: { _id: unknown; name: string; role: 'student' | 'teacher' }) {
  const principal: Principal = {
    id: String(user._id),
    name: user.name,
    role: user.role,
  };
  return { token: jwt.sign(principal, env.JWT_SECRET, { expiresIn: '12h' }), user: principal };
}

router.post(
  '/auth/register',
  asyncRoute(async (req, res) => {
    const { email, password, name, role } = credentials
      .extend({
        name: z.string().min(1).max(80),
        role: z.enum(['student', 'teacher']),
      })
      .parse(req.body);

    const existing = await User.findOne({ email });
    if (existing) throw new HttpError(409, 'An account with that email already exists', 'EMAIL_TAKEN');

    const user = await User.create({
      email,
      name,
      role,
      passwordHash: await hashPassword(password),
    });

    res.status(201).json(issueToken(user));
  }),
);

router.post(
  '/auth/login',
  asyncRoute(async (req, res) => {
    const { email, password } = credentials.parse(req.body);

    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw unauthorized('Incorrect email or password');
    }

    res.json(issueToken(user));
  }),
);

router.get(
  '/auth/me',
  asyncRoute(async (req, res) => {
    if (!req.user) throw unauthorized();
    res.json(req.user);
  }),
);

// --------------------------------------------------------------------------
// Meta
// --------------------------------------------------------------------------
router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    database: databaseReady() ? 'connected' : 'disconnected',
    llmProvider: providerName(),
    executor: getExecutor().name,
  });
});

router.get('/state-machine', (_req, res) => {
  res.json({
    transitions: TRANSITIONS,
    mermaid: toMermaid(),
    markdown: toMarkdownTable(),
  });
});

// --------------------------------------------------------------------------
// PraxisAI chat
// --------------------------------------------------------------------------
router.post(
  '/chat',
  asyncRoute(async (req, res) => {
    if (!req.user) throw unauthorized();

    const { message, history } = z
      .object({
        message: z.string().min(1).max(4_000),
        history: z
          .array(z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string().max(4_000),
          }))
          .max(20)
          .default([]),
      })
      .parse(req.body);

    res.json(await chat(history, message));
  }),
);

const publicProblem = (p: Problem) => ({
  slug: p.slug,
  title: p.title,
  prompt: p.prompt,
  difficulty: p.difficulty,
  topic: p.topic,
  visibleTests: p.visibleTests,
  starter: p.starter,
  generated: Boolean(p.generated),
});

router.get('/problems', (_req, res) => {
  res.json({ problems: allProblems().map(publicProblem), topics: TOPICS });
});

router.post(
  '/problems/generate',
  asyncRoute(async (req, res) => {
    if (!req.user) throw unauthorized();

    const { difficulty, topic } = z
      .object({
        difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
        topic: z.string().max(40).optional(),
      })
      .parse(req.body ?? {});

    const problem = await generateProblem(difficulty, topic);

    if (!problem) {
      throw new HttpError(
        503,
        isMockLLM
          ? 'New problems need an AI key. Pick one from the list for now.'
          : 'Could not create a new problem just then. Please try again.',
        'GENERATION_UNAVAILABLE',
      );
    }

    registerGenerated(problem);
    res.status(201).json(publicProblem(problem));
  }),
);

// --------------------------------------------------------------------------
// Doubts
// --------------------------------------------------------------------------
router.post(
  '/doubts',
  requireRole('student'),
  asyncRoute(async (req, res) => {
    const { title, body } = z
      .object({ title: z.string().min(3).max(300), body: z.string().min(3).max(10_000) })
      .parse(req.body);

    const scan = scanForInjection(`${title}\n${body}`);

    const doubt = await Doubt.create({
      studentId: req.user!.id,
      title,
      body,
      injectionFlagged: scan.flagged,
      injectionSignals: scan.signals.map((s) => s.rule),
    });

    const t = await ml.triage(title, body);

    const draft = await draftAnswer({ title, body });

    const answer = await Answer.create({
      doubtId: doubt._id,
      content: draft.content,
      state: 'draft',
      version: 0,
      authoredBy: 'model',
      llm: {
        provider: draft.provider,
        model: draft.model,
        promptTokens: draft.promptTokens,
        completionTokens: draft.completionTokens,
        latencyMs: draft.latencyMs,
        injectionFlagged: scan.flagged,
        injectionSignals: scan.signals.map((s) => s.rule),
      },
      triage: {
        topic: t.topic,
        urgency: t.urgency,
        confidence: t.confidence,
        lane: t.lane,
        thresholdUsed: t.thresholdUsed,
      },
    });

    await repo.transition({
      answerId: answer._id,
      to: 'pending',
      action: 'submit_for_review',
      role: 'system',
      expectedVersion: 0,
    });

    res.status(201).json({
      doubt,
      answerId: answer._id,
      triage: t,
      injectionFlagged: scan.flagged,
      injectionSignals: scan.signals,
    });
  }),
);

router.get(
  '/doubts',
  asyncRoute(async (req, res) => {
    const doubts = await Doubt.find().sort({ createdAt: -1 }).limit(100).lean();
    const isTeacher = req.user?.role === 'teacher';

    const withAnswers = await Promise.all(
      doubts.map(async (d) => {
        const answer = isTeacher
          ? await Answer.findOne({ doubtId: d._id }).sort({ createdAt: -1 }).lean()
          : await repo.studentVisibleAnswer(d._id);

        return {
          ...d,
          answer: answer
            ? {
                _id: answer._id,
                content: answer.content,
                state: answer.state,
                version: answer.version,
                authoredBy: answer.authoredBy,
                triage: answer.triage,
              }
            : null,
        };
      }),
    );

    res.json(withAnswers);
  }),
);

// --------------------------------------------------------------------------
// Review
// --------------------------------------------------------------------------
router.get(
  '/review/queue',
  requireRole('teacher'),
  asyncRoute(async (_req, res) => {
    const queue = await repo.reviewQueue();
    const withDoubts = await Promise.all(
      queue.map(async (a) => ({
        ...a,
        doubt: await Doubt.findById(a.doubtId).lean(),
      })),
    );
    res.json(withDoubts);
  }),
);

const actionSchema = z.object({
  expectedVersion: z.number().int().min(0),
  note: z.string().max(2000).optional(),
  content: z.string().max(20_000).optional(),
});

router.post(
  '/review/:id/:action',
  requireRole('teacher'),
  asyncRoute(async (req, res) => {
    const { expectedVersion, note, content } = actionSchema.parse(req.body);
    const action = req.params.action as 'approve' | 'reject' | 'edit' | 'revoke' | 'reopen';

    const target = {
      approve: 'approved',
      reject: 'rejected',
      edit: 'pending',
      revoke: 'pending',
      reopen: 'pending',
    }[action];

    if (!target) throw notFound('Action');

    const updated = await repo.transition({
      answerId: req.params.id!,
      to: target as never,
      action,
      role: 'teacher',
      actorId: undefined,
      note,
      expectedVersion,
      content,
    });

    res.json(updated);
  }),
);

router.get(
  '/review/:id/history',
  asyncRoute(async (req, res) => {
    res.json(await repo.history(req.params.id!));
  }),
);

// --------------------------------------------------------------------------
// Submissions
// --------------------------------------------------------------------------
router.post(
  '/submissions',
  requireRole('student'),
  asyncRoute(async (req, res) => {
    const { problemSlug, source } = z
      .object({ problemSlug: z.string(), source: z.string().min(1).max(50_000) })
      .parse(req.body);

    const problem = problemBySlug(problemSlug);
    if (!problem) throw notFound('Problem');

    const scan = scanCode(source);

    const result = await getExecutor().run({
      source,
      tests: problem.visibleTests,
    });

    const submission = await Submission.create({
      studentId: req.user!.id,
      problemSlug,
      source,
      visiblePassed: result.passed,
      visibleTotal: result.total,
      status: result.status,
      stderr: result.stderr,
      runtimeMs: result.runtimeMs,
      injectionFlagged: scan.flagged,
      injectionSignals: scan.signals.map((s) => s.rule),
    });

    res.status(201).json({
      submission,
      execution: result,
      injectionFlagged: scan.flagged,
      injectionSignals: scan.signals,
    });
  }),
);

router.get(
  '/submissions',
  asyncRoute(async (req, res) => {
    const filter = req.user?.role === 'teacher' ? {} : { studentId: req.user?.id };
    res.json(
      await Submission.find(filter).sort({ createdAt: -1 }).limit(50).lean(),
    );
  }),
);
