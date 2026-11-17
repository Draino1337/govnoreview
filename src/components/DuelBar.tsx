import type { CSSProperties, ReactNode } from 'react';
import { fmtInt } from '../lib/insights.ts';

interface Props {
  label: ReactNode;
  sub?: string;
  a?: number;
  b?: number;
  max?: number;
  /** меньше — лучше (вес, время зарядки) */
  low?: boolean;
  fmt?: (n: number) => string;
  unit?: string;
}

/** Две полоски одной метрики; победитель подсвечен и получает бейдж с разницей. */
export function DuelBar({ label, sub, a, b, max, low = false, fmt = fmtInt, unit = '' }: Props) {
  const both = a != null && b != null;
  const win = both && a !== b ? ((low ? a < b : a > b) ? 'a' : 'b') : null;
  const hi = both ? Math.max(a, b) : 0;
  const lo = both ? Math.min(a, b) : 0;
  const pct = win && (low ? hi : lo) > 0 ? Math.round(((hi - lo) / (low ? hi : lo)) * 100) : 0;
  const top = max ?? (Math.max(a ?? 0, b ?? 0) || 1);

  const width = (v?: number) => {
    if (v == null || v <= 0) return 0;
    if (low && both) return Math.max(6, (lo / v) * 100);
    return Math.max(4, Math.min(100, (v / top) * 100));
  };

  const line = (side: 'a' | 'b', v?: number) => (
    <div className={`duel-line is-${side}${win === side ? ' is-win' : ''}`}>
      <div className="duel-track">
        <i style={{ '--w': `${width(v)}%` } as CSSProperties} />
      </div>
      <b>{v == null ? 'н/д' : `${fmt(v)}${unit}`}</b>
    </div>
  );

  return (
    <div className="duel">
      <div className="duel-top">
        <span className="duel-label">
          {label}
          {sub && <small>{sub}</small>}
        </span>
        {win && pct > 0 && (
          <span className={`duel-badge is-${win}`}>
            {low ? '−' : '+'}
            {pct}%
          </span>
        )}
      </div>
      {line('a', a)}
      {line('b', b)}
    </div>
  );
}
