
import { describe, expect, it } from 'vitest';

import {
  ACTOR_ROLES,
  ANSWER_STATES,
  ForbiddenTransitionError,
  IllegalTransitionError,
  STUDENT_VISIBLE_STATES,
  TERMINAL_STATES,
  TRANSITIONS,
  assertTransition,
  findTransition,
  isStudentVisible,
  legalTargetsFrom,
  toMermaid,
  type ActorRole,
  type AnswerState,
  type TransitionAction,
} from '../../src/modules/review/state-machine.js';

const ALL_ACTIONS: TransitionAction[] = [
  'submit_for_review',
  'approve',
  'reject',
  'edit',
  'revoke',
  'reopen',
  'supersede',
];

describe('the invariant that matters', () => {
  it('approved is reachable ONLY from pending', () => {
    const intoApproved = TRANSITIONS.filter((t) => t.to === 'approved');

    expect(intoApproved).toHaveLength(1);
    expect(intoApproved[0]!.from).toBe('pending');
    expect(intoApproved[0]!.action).toBe('approve');
  });

  it('only a teacher can approve — never the system, never a student', () => {
    const approve = TRANSITIONS.find((t) => t.to === 'approved')!;
    expect(approve.allowedRoles).toEqual(['teacher']);
  });

  it('there is no path from draft straight to approved', () => {
    expect(findTransition('draft', 'approved', 'approve')).toBeUndefined();

    for (const action of ALL_ACTIONS) {
      expect(() =>
        assertTransition({
          from: 'draft',
          to: 'approved',
          action,
          role: 'teacher',
        }),
      ).toThrow(IllegalTransitionError);
    }
  });

  it('the system cannot publish its own draft under any action or role', () => {
    for (const action of ALL_ACTIONS) {
      expect(() =>
        assertTransition({
          from: 'draft',
          to: 'approved',
          action,
          role: 'system',
          note: 'high confidence',
        }),
      ).toThrow();
    }
  });

  it('only approved content is student-visible', () => {
    expect(STUDENT_VISIBLE_STATES).toEqual(['approved']);

    for (const state of ANSWER_STATES) {
      expect(isStudentVisible(state)).toBe(state === 'approved');
    }
  });
});

describe('exhaustive legality over the full product space', () => {
  it('accepts exactly the declared edges and rejects all others', () => {
    let accepted = 0;
    let rejected = 0;

    for (const from of ANSWER_STATES) {
      for (const to of ANSWER_STATES) {
        for (const action of ALL_ACTIONS) {
          const declared = findTransition(from, to, action);

          if (declared) {
            const role = declared.allowedRoles[0]!;
            expect(() =>
              assertTransition({ from, to, action, role, note: 'because' }),
            ).not.toThrow();
            accepted += 1;
          } else {
            for (const role of ACTOR_ROLES) {
              expect(() =>
                assertTransition({ from, to, action, role, note: 'because' }),
              ).toThrow();
            }
            rejected += 1;
          }
        }
      }
    }

    expect(accepted + rejected).toBe(
      ANSWER_STATES.length * ANSWER_STATES.length * ALL_ACTIONS.length,
    );
    expect(accepted).toBe(TRANSITIONS.length);
    expect(rejected).toBe(175 - TRANSITIONS.length);
  });

  it('every state pair that is not declared is refused', () => {
    const declaredPairs = new Set(TRANSITIONS.map((t) => `${t.from}->${t.to}`));

    for (const from of ANSWER_STATES) {
      for (const to of ANSWER_STATES) {
        if (declaredPairs.has(`${from}->${to}`)) continue;

        const threw = ALL_ACTIONS.every((action) =>
          ACTOR_ROLES.every((role) => {
            try {
              assertTransition({ from, to, action, role, note: 'x' });
              return false;
            } catch {
              return true;
            }
          }),
        );
        expect(threw, `${from} -> ${to} should be unreachable`).toBe(true);
      }
    }
  });
});

describe('role enforcement', () => {
  it('a student cannot perform any transition at all', () => {
    for (const t of TRANSITIONS) {
      expect(() =>
        assertTransition({
          from: t.from,
          to: t.to,
          action: t.action,
          role: 'student',
          note: 'please',
        }),
      ).toThrow();
    }
  });

  it('rejects a legal edge attempted by the wrong role', () => {
    expect(() =>
      assertTransition({
        from: 'draft',
        to: 'pending',
        action: 'submit_for_review',
        role: 'teacher',
      }),
    ).toThrow(ForbiddenTransitionError);
  });

  it('the system cannot approve, reject, revoke or reopen', () => {
    const forbidden: Array<[AnswerState, AnswerState, TransitionAction]> = [
      ['pending', 'approved', 'approve'],
      ['pending', 'rejected', 'reject'],
      ['approved', 'pending', 'revoke'],
      ['rejected', 'pending', 'reopen'],
    ];

    for (const [from, to, action] of forbidden) {
      expect(() =>
        assertTransition({ from, to, action, role: 'system', note: 'auto' }),
      ).toThrow(ForbiddenTransitionError);
    }
  });
});

describe('decision notes', () => {
  it('every destructive or reversing transition demands a note', () => {
    const mustExplain = TRANSITIONS.filter((t) =>
      ['reject', 'revoke', 'reopen'].includes(t.action),
    );
    expect(mustExplain.length).toBeGreaterThan(0);

    for (const t of mustExplain) {
      expect(t.requiresNote, `${t.action} should require a note`).toBe(true);

      expect(() =>
        assertTransition({
          from: t.from,
          to: t.to,
          action: t.action,
          role: t.allowedRoles[0]!,
        }),
      ).toThrow(IllegalTransitionError);

      expect(() =>
        assertTransition({
          from: t.from,
          to: t.to,
          action: t.action,
          role: t.allowedRoles[0]!,
          note: '   ',
        }),
      ).toThrow(IllegalTransitionError);
    }
  });

  it('approval does not require a note — it is the non-destructive default', () => {
    expect(() =>
      assertTransition({
        from: 'pending',
        to: 'approved',
        action: 'approve',
        role: 'teacher',
      }),
    ).not.toThrow();
  });
});

describe('terminal states', () => {
  it('nothing escapes a terminal state', () => {
    for (const from of TERMINAL_STATES) {
      expect(legalTargetsFrom(from)).toHaveLength(0);

      for (const to of ANSWER_STATES) {
        for (const action of ALL_ACTIONS) {
          for (const role of ACTOR_ROLES) {
            expect(() =>
              assertTransition({ from, to, action, role, note: 'x' }),
            ).toThrow(IllegalTransitionError);
          }
        }
      }
    }
  });
});

describe('editing is not approving', () => {
  it('edit keeps an answer in pending', () => {
    const edit = TRANSITIONS.find((t) => t.action === 'edit')!;
    expect(edit.from).toBe('pending');
    expect(edit.to).toBe('pending');
  });

  it('a teacher editing a draft cannot thereby publish it', () => {
    expect(() =>
      assertTransition({
        from: 'pending',
        to: 'approved',
        action: 'edit',
        role: 'teacher',
      }),
    ).toThrow(IllegalTransitionError);
  });
});

describe('generated documentation stays in sync', () => {
  it('the mermaid diagram contains every declared edge', () => {
    const diagram = toMermaid();
    for (const t of TRANSITIONS) {
      expect(diagram).toContain(`${t.from} --> ${t.to}: ${t.action}`);
    }
  });
});
