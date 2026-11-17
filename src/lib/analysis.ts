import type { Phone } from '../types.ts';
import { getMetrics, type Metrics } from './metrics.ts';
import { scoreAll, type Scores } from './score.ts';

export interface Analysis {
  m: Metrics;
  s: Scores;
}

const cache = new Map<string, Analysis>();

/** метрики и оценки считаются один раз на телефон */
export function analyze(p: Phone): Analysis {
  let a = cache.get(p.id);
  if (!a) {
    const m = getMetrics(p);
    a = { m, s: scoreAll(m) };
    cache.set(p.id, a);
  }
  return a;
}
