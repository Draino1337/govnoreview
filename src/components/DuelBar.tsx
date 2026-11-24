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

/** Две полоски одной метрики. Отрезок, на который победитель обходит соперника, залит бегущим градиентом его цвета,
    у проигравшего на этом месте — бледный «призрак»: видно, сколько не хватает. */
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
  const val = (v?: number) => (v == null ? 'н/д' : `${fmt(v)}${unit}`);

  const head = (
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
  );

  const wa = width(a);
  const wb = width(b);
  const span = { '--from': `${win === 'a' ? wb : wa}%`, '--to': `${win === 'a' ? wa : wb}%` } as CSSProperties;

  const line = (side: 'a' | 'b', v?: number) => (
    <div className={`duel-line is-${side}${win === side ? ' is-win' : ''}`}>
      <div className="duel-track" style={span}>
        {/* у победителя сплошная заливка — до конца полосы соперника, дальше перевес с бегущим градиентом */}
        <i style={{ '--w': `${win === side ? Math.min(wa, wb) : side === 'a' ? wa : wb}%` } as CSSProperties} />
        {win && <span className="duel-ghost" />}
        {win === side && <span className="duel-glow" />}
        {win === side && <span className="duel-gain" />}
      </div>
      <b>{val(v)}</b>
    </div>
  );

  return (
    <div className="duel">
      {head}
      {line('a', a)}
      {line('b', b)}
    </div>
  );
}
