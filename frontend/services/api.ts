import axios, { AxiosError } from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const http = axios.create({
  baseURL: `${BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('praxis.token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (r) => r,
  (error: AxiosError<{ error?: string; code?: string }>) => {
    const err = new Error(
      error.response?.data?.error ?? error.message ?? 'Request failed',
    ) as Error & { code?: string; status?: number };
    err.code = error.response?.data?.code;
    err.status = error.response?.status;
    return Promise.reject(err);
  },
);

export interface Principal { id: string; name: string; role: 'student' | 'teacher' }
export interface Signal { rule: string; category: string; excerpt: string }
export interface Triage {
  topic: string; urgency: string; confidence: number; lane: string; degraded: boolean;
}
export interface Answer {
  _id: string; content: string; state: string; version: number;
  authoredBy: string; triage?: Triage;
}
export interface DoubtRow {
  _id: string; title: string; body: string; createdAt: string;
  injectionFlagged?: boolean; answer: Answer | null;
}
export interface QueueRow extends Answer {
  doubt: { _id: string; title: string; body: string; injectionFlagged?: boolean } | null;
  llm?: { injectionFlagged?: boolean; injectionSignals?: string[]; provider?: string };
}
export interface HistoryRow {
  from: string; to: string; action: string; actorRole: string;
  note?: string; fromVersion: number; at: string;
}
export interface Execution {
  passed: number; total: number; status: string; stderr: string; runtimeMs: number;
}
export interface Submission {
  _id: string; problemSlug: string; visiblePassed: number; visibleTotal: number;
  status: string; runtimeMs: number; createdAt: string;
  injectionFlagged?: boolean; feedback?: string; predictedQuality?: number;
}
export interface Problem {
  slug: string;
  title: string;
  prompt: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  visibleTests: string[];
  starter: string;
  generated?: boolean;
}
export interface TransitionRow {
  from: string; to: string; action: string; allowedRoles: string[]; requiresNote: boolean;
}
export interface Health {
  ok: boolean; database: string; llmProvider: string; executor: string;
}

export const api = {
  health: () => http.get<Health>('/health').then((r) => r.data),

  login: (email: string, password: string) =>
    http.post<{ token: string; user: Principal }>('/auth/login', { email, password })
        .then((r) => r.data),

  register: (name: string, email: string, password: string, role: 'student' | 'teacher') =>
    http.post<{ token: string; user: Principal }>('/auth/register',
      { name, email, password, role }).then((r) => r.data),

  chat: (message: string, history: Array<{ role: 'user' | 'assistant'; content: string }>) =>
    http.post<{ content: string; flagged: boolean; provider: string }>('/chat',
      { message, history }).then((r) => r.data),

  problems: () =>
    http.get<{ problems: Problem[]; topics: string[] }>('/problems').then((r) => r.data),

  generateProblem: (difficulty: 'easy' | 'medium' | 'hard', topic?: string) =>
    http.post<Problem>('/problems/generate', { difficulty, topic }).then((r) => r.data),

  doubts: () => http.get<DoubtRow[]>('/doubts').then((r) => r.data),

  postDoubt: (title: string, body: string) =>
    http.post<{
      answerId: string; triage: Triage;
      injectionFlagged: boolean; injectionSignals: Signal[];
    }>('/doubts', { title, body }).then((r) => r.data),

  queue: () => http.get<QueueRow[]>('/review/queue').then((r) => r.data),

  act: (id: string, action: string,
        payload: { expectedVersion: number; note?: string; content?: string }) =>
    http.post<Answer>(`/review/${id}/${action}`, payload).then((r) => r.data),

  history: (id: string) =>
    http.get<HistoryRow[]>(`/review/${id}/history`).then((r) => r.data),

  submit: (problemSlug: string, source: string) =>
    http.post<{
      execution: Execution; submission: Submission;
      injectionFlagged: boolean; injectionSignals: Signal[];
    }>('/submissions', { problemSlug, source }).then((r) => r.data),

  submissions: () => http.get<Submission[]>('/submissions').then((r) => r.data),

  stateMachine: () =>
    http.get<{ mermaid: string; transitions: TransitionRow[] }>('/state-machine')
        .then((r) => r.data),
};
