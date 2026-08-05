
import { env } from '../../config/env.js';
import { logger } from '../../core/logger.js';

export interface TriageResult {
  topic: string;
  urgency: 'low' | 'medium' | 'high';
  confidence: number;
  lane: 'auto' | 'review';
  thresholdUsed: number;
  degraded: boolean;
}

export interface QualityResult {
  predictedQuality: number;
  degraded: boolean;
}

const FALLBACK_THRESHOLD = 1.0;

async function post<T>(path: string, body: unknown): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.ML_API_TIMEOUT_MS);

  try {
    const res = await fetch(`${env.ML_API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function triage(title: string, body: string): Promise<TriageResult> {
  const out = await post<Omit<TriageResult, 'degraded'>>('/predict/triage', {
    title,
    body,
  });

  if (!out) {
    logger.warn('ML service unreachable — routing this doubt to teacher review');
    return {
      topic: 'unknown',
      urgency: 'medium',
      confidence: 0,
      lane: 'review',
      thresholdUsed: FALLBACK_THRESHOLD,
      degraded: true,
    };
  }

  return { ...out, degraded: false };
}

export async function predictQuality(features: Record<string, unknown>): Promise<QualityResult> {
  const out = await post<{ predictedQuality: number }>('/predict/grade', features);
  if (!out) return { predictedQuality: -1, degraded: true };
  return { predictedQuality: out.predictedQuality, degraded: false };
}
