# Praxis

**Graded code, moderated answers.**

AI-augmented code assessment and moderated doubt resolution for classrooms.

Students submit code, which is executed in an isolated sandbox against test cases and scored.
An LLM adds qualitative feedback. Students also post doubts to a shared board, where an LLM
drafts an answer — but **no AI-drafted answer is ever shown to another student until a teacher
approves it**. Every draft moves through an explicit, database-enforced state machine.

---

## Why this repo contains two assignments

Praxis is submitted for both the **GenAI** and the **ML** assignment, because they describe the
same system. Rather than build a web app and an unrelated notebook, Praxis wires them together:

- The **ML pipeline** trains a grading-quality regressor and a doubt-triage classifier, and serves
  them from a FastAPI service.
- The **application** consumes that service. The triage classifier's *calibrated confidence* is what
  decides whether a drafted answer can take the auto-approval lane or must be escalated to a
  teacher — routing through the *same* state machine the LLM drafts use.
- The ML training data for code quality is **produced by this repo's own sandbox executor**,
  running real code against real test cases.

The ML brief asks the candidate to *"simulate a routing decision"*. Praxis does not simulate it.

```
Student submits code ──► Sandbox executor ──► test results ──┐
                                                             │
                                   ┌─────────────────────────┴──► ML: quality score (LightGBM)
                                   └──► LLM: qualitative feedback (quarantined, no tools)

Student posts doubt ──► ML: topic + urgency + CALIBRATED CONFIDENCE
                                   │
                          conf ≥ τ ─┤ auto-approve lane ──┐
                          conf < τ ─┘ teacher review    ──┴──► state machine ──► published
```

---

## Running without an API key

The whole stack — including every test — runs offline with no LLM credentials.
`LLM_PROVIDER=mock` uses a deterministic stub provider, so a reviewer can clone and verify
the sandbox, the state machine, and the injection defenses without spending anything.

```bash
cp .env.example .env
npm install
npm test
```

---

## Layout

| Path | What |
|------|------|
| `apps/web` | Next.js frontend |
| `apps/api` | Express + TypeScript backend, Mongoose models, state machine |
| `services/executor` | Sandboxed code execution — pluggable adapters (WASM, Docker) |
| `services/ml-api` | FastAPI service serving both models |
| `ml/` | Data pipeline, leakage audit, training, calibration, conformal routing |
| `packages/shared` | Types shared between web and api |
| `tests/` | Cross-cutting suites: injection, sandbox escape, FSM |
| `docs/` | Architecture, threat model, state machine, model card |

---

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — system design and module boundaries
- [`docs/state-machine.md`](docs/state-machine.md) — approval FSM, legal transitions, concurrency
- [`docs/sandbox-security.md`](docs/sandbox-security.md) — tiered threat model and escape results
- [`docs/prompt-injection-report.md`](docs/prompt-injection-report.md) — attack corpus and defense results
- [`docs/model-card.md`](docs/model-card.md) — model intent, metrics, limitations
- [`docs/data-card.md`](docs/data-card.md) — data provenance, labeling, known noise

---

## Status

Work in progress. See commit history.
