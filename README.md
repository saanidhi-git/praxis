<div align="center">

# Praxis

### Practice code. Get answers you can trust.

An AI-assisted coding practice platform where every AI-written answer is reviewed by a teacher before a student can read it.

[![Live App](https://img.shields.io/badge/Live_App-Open-6366f1?style=for-the-badge&logo=vercel&logoColor=white)](https://praxis-saanidhis-projects.vercel.app)
[![API](https://img.shields.io/badge/API-Health-10b981?style=for-the-badge&logo=render&logoColor=white)](https://praxis-il4o.onrender.com/api/health)
[![ML Pipeline](https://img.shields.io/badge/ML_Pipeline-Repo-f59e0b?style=for-the-badge&logo=github&logoColor=white)](https://github.com/saanidhi-git/praxis-ml)

</div>

---

## Tech Stack

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=for-the-badge&logo=mongoose&logoColor=white)

![Groq](https://img.shields.io/badge/Groq_LLM-F55036?style=for-the-badge&logo=groq&logoColor=white)
![Python](https://img.shields.io/badge/Python_Sandbox-3776AB?style=for-the-badge&logo=python&logoColor=white)
![JWT](https://img.shields.io/badge/JWT_Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)

![Monaco](https://img.shields.io/badge/Monaco_Editor-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)

</div>

---

## Live Links

| | |
|---|---|
| **Live application** | https://praxis-saanidhis-projects.vercel.app |
| **API health** | https://praxis-il4o.onrender.com/api/health |

**Demo accounts**

| Role | Email | Password |
|---|---|---|
| Student | `student@praxis.app` | `praxis123` |
| Teacher | `teacher@praxis.app` | `praxis123` |

> The API runs on a free instance that sleeps after inactivity. The first request may take up to a minute to wake it. Load the health URL once before exploring.

---

## What It Does

Praxis is a learning platform built around one rule: **an AI answer is a suggestion, never a publication.**

**Students** pick a problem, write a solution in an in-browser editor, and run it against sample tests. Execution happens server-side in an isolated process, so the platform never trusts submitted code. Students also post questions to a shared doubt board and can ask **PraxisAI**, a study assistant, for explanations at any time.

**Teachers** get a review queue. When a student asks a question, an AI drafts an answer immediately — but that draft is invisible to every other student until a teacher approves it. Teachers can approve, edit before approving, or reject with a reason.

The result is a system that gets the speed benefit of AI without the failure mode of a confidently wrong answer reaching an entire class.

---

## Core Features

### Practice and grading
- In-browser **Monaco** editor with a split view: problem, sample tests, editor, and results
- Curated problem catalogue across difficulty levels and topics, with search and filtering
- **AI-generated problems on demand** — the model's own reference solution is executed against its own tests, and the problem is discarded unless every test passes
- Sample tests are shown; a separate hidden suite determines the real grade
- Submission history with a per-attempt detail drawer

### Doubt board and moderated review
- Students post questions; an AI draft is generated and queued
- Explicit approval workflow: `draft → pending → approved`
- Teachers approve, edit, or reject with a required reason
- Append-only audit trail on every state change
- Students only ever see approved content — enforced by the database query, not by hiding it in the UI

### PraxisAI assistant
- Floating assistant available on every page
- Answers concept questions, explains errors, and helps debug
- Deliberately cannot approve, publish, or alter any record

### Security
- Sandboxed execution with wall-clock timeout, output cap, and a stripped environment
- Prompt-injection detection across instruction override, authority claims, workflow manipulation, exfiltration, delimiter escape, and encoding attempts
- Injection scanning of both question text and submitted source, including comments and string literals
- JWT authentication with bcrypt-hashed passwords and role-based access control

---

## Architecture

```
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│   Next.js    │  HTTPS │   Express    │        │ MongoDB      │
│   Frontend   │ ─────► │   REST API   │ ─────► │ Atlas        │
│   (Vercel)   │        │   (Render)   │        │              │
└──────────────┘        └──────┬───────┘        └──────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
      ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
      │   Python     │ │  Groq LLM    │ │  ML Service  │
      │   Sandbox    │ │  (guarded)   │ │  (optional)  │
      └──────────────┘ └──────────────┘ └──────────────┘
```

### The approval state machine

The load-bearing design decision. `approved` is reachable **only** from `pending`, and **only** by a teacher. There is no edge from `draft` to `approved`.

This means a prompt injection cannot publish itself to students no matter what it persuades the model to write. The protection is structural rather than filter-based — filters can be evaded, a missing edge in a state machine cannot.

Transitions are applied with an **atomic compare-and-swap** on a version field, so two teachers acting on the same draft simultaneously cannot both succeed. The loser receives a conflict response and refetches.

### Defence in depth against prompt injection

| Layer | What it does |
|---|---|
| **Privilege separation** | The model reading untrusted content has no tools, no database handle, and cannot change state |
| **Spotlighting** | Untrusted text is wrapped in a randomised, per-request boundary marker and explicitly labelled as data |
| **Structured output** | Responses must match a schema; free prose that ignores it is rejected before storage |
| **Canary token** | A secret marker in the system prompt — if it appears in output, the response is discarded |
| **Pattern detection** | Signals across six categories, surfaced to the teacher rather than silently dropped |

Detection is listed **last** deliberately. Pattern matching is evadable and is used for flagging and measurement, not for safety. The structural layers do the real work.

---

## Repository Structure

```
praxis/
├── backend/
│   └── src/
│       ├── config/          environment validation
│       ├── core/            database, logging, error translation
│       ├── modules/
│       │   ├── ai/          LLM providers, chat, injection guards
│       │   ├── auth/        users, password hashing
│       │   ├── doubts/      question board
│       │   ├── review/      state machine, repository, audit trail
│       │   └── submissions/ executor, problems, AI generation
│       ├── routes.ts
│       └── server.ts
│   └── tests/               state machine and concurrency suites
│
├── frontend/
│   ├── app/                 dashboard, practice, history, board, review
│   ├── components/          shell, sign-in, PraxisAI, UI primitives
│   ├── context/             auth context
│   └── services/            API client
│
└── docs/
```

---

## Running Locally

**Prerequisites:** Node.js 20+, Python 3 (for the sandbox), and MongoDB — either local or an Atlas connection string.

**1. Clone and install**

```bash
git clone https://github.com/saanidhi-git/praxis.git
cd praxis
npm run install:all
```

**2. Configure the backend**

```bash
cp .env.example backend/.env
```

The defaults work against a local MongoDB with no API keys required.

**3. Start the API**

```bash
cd backend
npm run dev
```

**4. Start the frontend** (in a second terminal)

```bash
cd frontend
npm run dev
```

Open **http://localhost:3000**. Demo accounts are seeded automatically on first run.

### Running with no API key

The entire stack — including every test — runs offline. With `LLM_PROVIDER=mock`, a deterministic stub provider stands in for the model, so the sandbox, the state machine, and the injection defences can all be verified without spending anything. Set `LLM_PROVIDER=groq` and supply `GROQ_API_KEY` to enable live AI features.

### Tests

```bash
cd backend
npm test
```

The suite enumerates **every** state-by-action combination against the approval machine and asserts that only the legal transitions are accepted. It also covers optimistic-concurrency conflicts, note requirements on rejection, and role enforcement.

---

## Environment Variables

| Variable | Purpose | Default |
|---|---|---|
| `MONGODB_URI` | Database connection | local MongoDB |
| `JWT_SECRET` | Token signing key | dev fallback |
| `CORS_ORIGIN` | Allowed frontend origins | `http://localhost:3000` |
| `LLM_PROVIDER` | `mock` or `groq` | `mock` |
| `GROQ_API_KEY` | Required only for live AI | — |
| `EXECUTOR_TIMEOUT_MS` | Sandbox wall-clock limit | `5000` |
| `EXECUTOR_MAX_OUTPUT_BYTES` | Output cap | `65536` |
| `NEXT_PUBLIC_API_URL` | API base URL (frontend, build-time) | `http://localhost:4000` |

---

## Tradeoffs and Design Decisions

This section is the honest account of what was chosen, what was rejected, and what is genuinely not solved.

### The sandbox is hardened, not bulletproof

Code runs in a subprocess with a wall-clock timeout, a capped output buffer, an isolated interpreter, a temporary working directory, and a stripped environment — student code cannot read the database URI, the JWT secret, or any API key. This reliably contains the realistic failure modes: infinite loops, runaway output, and accidental damage.

**It is not a security boundary against a determined attacker.** A subprocess shares the host kernel. The current industry position is that even containers are insufficient for genuinely untrusted code, because every container calls into the same kernel and a single syscall bug is an escape.

The correct production answer is a hardware or syscall boundary — a Firecracker microVM or gVisor — where each workload gets its own kernel. The executor is written against a pluggable interface with a Docker adapter stubbed out to document exactly where that swaps in. Claiming this subprocess is "secure" would be an overstatement, so it is stated plainly instead.

### Detection is the weakest layer, and it is treated that way

A regex list for prompt injection can be defeated by paraphrase, encoding, or a language the list does not cover. It exists to flag and to measure. What actually protects students is the missing `draft → approved` edge: even a perfectly successful injection produces a draft, and a draft cannot reach anyone without a teacher.

### Authentication is real, but deliberately minimal

Passwords are bcrypt-hashed with per-user salts, never stored in plain text, and excluded from queries by default so they cannot leak through a careless read. Login responds identically for an unknown email and a wrong password, so timing and wording cannot be used to enumerate accounts.

There is no email verification, password reset, or rate-limited lockout. Those are well-understood and were out of scope; building them would have added surface area without demonstrating anything the brief asks about.

### AI-generated problems are verified, not trusted

A model will happily invent a problem whose "correct" solution fails its own tests. Serving that to a student is worse than serving nothing — they lose an hour proving the grader wrong. So every generated problem is executed before it is offered: the model's own reference solution runs against every test it wrote, in the same sandbox student code uses, and the problem is discarded unless all pass. Generation is retried a bounded number of times, and a rejected draft is treated as a normal outcome rather than an error.

This is the same principle as the doubt board. Model output is a proposal; something else verifies it. There it is a teacher, here it is the interpreter.

### Visible and hidden test suites

Students see sample tests and are graded on a hidden suite. Beyond mirroring real assessment, this keeps the grading target from being a trivial function of what students can observe, and it creates the honest failure mode the platform is designed around: code that satisfies the visible cases and fails the edge cases.

### The chat assistant answers directly; drafted answers do not

These have different risk profiles. A chat reply is seen only by the student who asked, is explicitly advisory, and changes no record. A drafted board answer is published to an entire class. The first can answer immediately; the second needs a human. Applying the same gate to both would have made the assistant useless without making anything safer.

### MongoDB over PostgreSQL

The brief specified a MERN stack. Mongo enforces the workflow through a collection-level JSON schema validator, an atomic compare-and-swap on every transition, and an append-only audit collection. A relational database would express the state machine more naturally with a CHECK constraint, but the guarantees here are real rather than advisory, and the correctness argument does not depend on application code being careful.

The local development database runs standalone, where multi-document transactions are unavailable. The repository layer degrades to compare-and-swap, which is the actual correctness mechanism — transactions only add atomicity between the state change and its audit row. Production runs on Atlas, where transactions are available.

### Two deployment bugs worth recording

Both builds passed locally and failed in the cloud for the same underlying reason, and the fix was the same lesson twice.

**Build tooling in the wrong dependency block.** Setting `NODE_ENV=production` causes npm to skip `devDependencies`. TypeScript and every `@types/*` package lived there, so the compiler ran with no type definitions at all and failed with errors that looked unrelated — a missing `process` global, a Mongoose field that had silently degraded to an untyped binary. Moving build-time packages into `dependencies` fixed it.

**Port binding and startup order.** The server read a custom port variable while the platform injects its own, and it waited for the database before opening a port. On a cold instance the database handshake can outlast the platform's port-detection window, so a perfectly healthy deploy gets killed for "no open ports". The server now binds immediately and connects afterwards, with the health endpoint reporting true database state.

The takeaway, which cost real time to learn: **reproduce the deployment environment rather than re-running the local build.** Both failures were caught the second time by simulating a production install locally before pushing.

### What is not solved

- The sandbox is not a true isolation boundary; that requires a microVM
- Injection detection is signature-based and will miss novel phrasings
- Free-tier hosting sleeps after inactivity, so the first request is slow
- The teacher review queue is not paginated and would need it at scale
- No real-time updates; teachers refresh to see new drafts

---

## Related Work

The machine-learning pipeline that predicts submission quality and triages questions by topic and urgency lives in a companion repository:

**https://github.com/saanidhi-git/praxis-ml**

---

<div align="center">

Built by **Saanidhi Gade**

</div>
