
export const ANSWER_STATES = [
  'draft',
  'pending',
  'approved',
  'rejected',
  'superseded',
] as const;

export type AnswerState = (typeof ANSWER_STATES)[number];

export const ACTOR_ROLES = ['system', 'teacher', 'student'] as const;
export type ActorRole = (typeof ACTOR_ROLES)[number];

export type TransitionAction =
  | 'submit_for_review'
  | 'approve'
  | 'reject'
  | 'edit'
  | 'revoke'
  | 'reopen'
  | 'supersede';

export interface Transition {
  readonly from: AnswerState;
  readonly to: AnswerState;
  readonly action: TransitionAction;
  readonly allowedRoles: readonly ActorRole[];
  readonly rationale: string;
  readonly requiresNote: boolean;
}

export const TRANSITIONS: readonly Transition[] = [
  {
    from: 'draft',
    to: 'pending',
    action: 'submit_for_review',
    allowedRoles: ['system'],
    rationale:
      'The model finishes a draft and queues it. This is the only exit from ' +
      'draft that leads anywhere near publication.',
    requiresNote: false,
  },
  {
    from: 'pending',
    to: 'approved',
    action: 'approve',
    allowedRoles: ['teacher'],
    rationale:
      'A teacher has read the draft and accepts it. This is the sole edge ' +
      'into `approved` in the entire machine.',
    requiresNote: false,
  },
  {
    from: 'pending',
    to: 'rejected',
    action: 'reject',
    allowedRoles: ['teacher'],
    rationale: 'A teacher judges the draft wrong or unhelpful.',
    requiresNote: true,
  },
  {
    from: 'pending',
    to: 'pending',
    action: 'edit',
    allowedRoles: ['teacher'],
    rationale:
      'A teacher rewrites the draft. It stays pending: editing is not the ' +
      'same act as approving, and conflating them would let a teacher publish ' +
      'by accident while still drafting.',
    requiresNote: false,
  },
  {
    from: 'approved',
    to: 'pending',
    action: 'revoke',
    allowedRoles: ['teacher'],
    rationale:
      'A published answer turns out to be wrong. It returns to review rather ' +
      'than being deleted, so the audit trail survives.',
    requiresNote: true,
  },
  {
    from: 'rejected',
    to: 'pending',
    action: 'reopen',
    allowedRoles: ['teacher'],
    rationale: 'A rejection is reconsidered. Rejected is not a dead end.',
    requiresNote: true,
  },
  {
    from: 'approved',
    to: 'superseded',
    action: 'supersede',
    allowedRoles: ['teacher', 'system'],
    rationale:
      'A newer approved answer replaces this one. Kept rather than deleted ' +
      'so historical student views remain explicable.',
    requiresNote: false,
  },
  {
    from: 'draft',
    to: 'rejected',
    action: 'reject',
    allowedRoles: ['teacher'],
    rationale:
      'A teacher discards a draft before it is ever queued — for example an ' +
      'answer the injection filter flagged.',
    requiresNote: true,
  },
] as const;

export const TERMINAL_STATES: readonly AnswerState[] = ['superseded'];

export const STUDENT_VISIBLE_STATES: readonly AnswerState[] = ['approved'];

export class IllegalTransitionError extends Error {
  readonly code = 'ILLEGAL_TRANSITION';
  constructor(
    readonly from: AnswerState,
    readonly to: AnswerState,
    readonly action: TransitionAction,
    reason: string,
  ) {
    super(`Illegal transition ${from} -> ${to} via "${action}": ${reason}`);
    this.name = 'IllegalTransitionError';
  }
}

export class ForbiddenTransitionError extends Error {
  readonly code = 'FORBIDDEN_TRANSITION';
  constructor(action: TransitionAction, role: ActorRole, allowed: readonly ActorRole[]) {
    super(
      `Role "${role}" may not perform "${action}" (allowed: ${allowed.join(', ')})`,
    );
    this.name = 'ForbiddenTransitionError';
  }
}

export function findTransition(
  from: AnswerState,
  to: AnswerState,
  action: TransitionAction,
): Transition | undefined {
  return TRANSITIONS.find(
    (t) => t.from === from && t.to === to && t.action === action,
  );
}

export function legalTargetsFrom(from: AnswerState): AnswerState[] {
  return [...new Set(TRANSITIONS.filter((t) => t.from === from).map((t) => t.to))];
}

export function isStudentVisible(state: AnswerState): boolean {
  return STUDENT_VISIBLE_STATES.includes(state);
}

export interface TransitionRequest {
  readonly from: AnswerState;
  readonly to: AnswerState;
  readonly action: TransitionAction;
  readonly role: ActorRole;
  readonly note?: string | undefined;
}

export function assertTransition(req: TransitionRequest): Transition {
  const { from, to, action, role, note } = req;

  if (TERMINAL_STATES.includes(from)) {
    throw new IllegalTransitionError(from, to, action, `"${from}" is terminal`);
  }

  const transition = findTransition(from, to, action);
  if (!transition) {
    const legal = legalTargetsFrom(from);
    throw new IllegalTransitionError(
      from,
      to,
      action,
      legal.length
        ? `no such edge; legal targets from "${from}" are: ${legal.join(', ')}`
        : `no transitions are defined from "${from}"`,
    );
  }

  if (!transition.allowedRoles.includes(role)) {
    throw new ForbiddenTransitionError(action, role, transition.allowedRoles);
  }

  if (transition.requiresNote && !note?.trim()) {
    throw new IllegalTransitionError(
      from,
      to,
      action,
      'this transition requires a note explaining the decision',
    );
  }

  return transition;
}

export function toMermaid(): string {
  const lines = ['stateDiagram-v2', '    [*] --> draft'];
  for (const t of TRANSITIONS) {
    lines.push(`    ${t.from} --> ${t.to}: ${t.action}`);
  }
  for (const s of TERMINAL_STATES) lines.push(`    ${s} --> [*]`);
  return lines.join('\n');
}

export function toMarkdownTable(): string {
  const rows = TRANSITIONS.map(
    (t) =>
      `| \`${t.from}\` | \`${t.to}\` | \`${t.action}\` | ${t.allowedRoles.join(', ')} | ${
        t.requiresNote ? 'yes' : 'no'
      } |`,
  );
  return [
    '| From | To | Action | Allowed roles | Note required |',
    '|------|----|--------|---------------|---------------|',
    ...rows,
  ].join('\n');
}
