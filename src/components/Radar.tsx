import { useState } from 'react';
import { useTweenArray } from '../lib/hooks.ts';

interface Props {
  labels: string[];
  /** undefined — данных нет: точка в центре, в подписи «н/д» */
  a: (number | undefined)[];
  b: (number | undefined)[];
  nameA: string;
  nameB: string;
}

const CX = 190;
const CY = 170;
const R = 112;
const ang = (i: number, n: number) => ((-90 + (360 / n) * i) * Math.PI) / 180;
const pt = (i: number, n: number, k: number) => [CX + Math.cos(ang(i, n)) * R * k, CY + Math.sin(ang(i, n)) * R * k] as const;
const poly = (vals: number[]) => vals.map((v, i) => pt(i, vals.length, v / 100).map((x) => x.toFixed(1)).join(',')).join(' ');

export function Radar({ labels, a, b, nameA, nameB }: Props) {
  const n = labels.length;
  const ta = useTweenArray(a.map((v) => v ?? 0));
  const tb = useTweenArray(b.map((v) => v ?? 0));
  const [hot, setHot] = useState<number | null>(null);

  return (
    <figure className="radar">
      <svg viewBox="-30 0 480 340" role="img" aria-label={`Радар категорий: ${nameA} и ${nameB}`}>
        {[0.25, 0.5, 0.75, 1].map((k) => (
          <polygon key={k} className="radar-ring" points={labels.map((_, i) => pt(i, n, k).join(',')).join(' ')} />
        ))}
        {labels.map((l, i) => {
          const [x, y] = pt(i, n, 1);
          const [lx, ly] = pt(i, n, 1.16);
          const anchor = Math.abs(lx - CX) < 8 ? 'middle' : lx > CX ? 'start' : 'end';
          return (
            <g key={l} className={`radar-axis${hot === i ? ' is-hot' : ''}`} onMouseEnter={() => setHot(i)} onClick={() => setHot(i)} onMouseLeave={() => setHot(null)} onFocus={() => setHot(i)} onBlur={() => setHot(null)} tabIndex={0}>
              <line x1={CX} y1={CY} x2={x} y2={y} />
              <text x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle">
                {l}
              </text>
              <circle cx={x} cy={y} r={20} fill="transparent" />
            </g>
          );
        })}
        <polygon className="radar-poly radar-a" points={poly(ta)} />
        <polygon className="radar-poly radar-b" points={poly(tb)} />
        {ta.map((v, i) => (
          <circle key={`a${i}`} className="radar-dot radar-a" r={hot === i ? 5.5 : 3.5} cx={pt(i, n, v / 100)[0]} cy={pt(i, n, v / 100)[1]} />
        ))}
        {tb.map((v, i) => (
          <circle key={`b${i}`} className="radar-dot radar-b" r={hot === i ? 5.5 : 3.5} cx={pt(i, n, v / 100)[0]} cy={pt(i, n, v / 100)[1]} />
        ))}
      </svg>
      <figcaption className="radar-cap" aria-live="polite">
        {hot == null ? (
          <span className="muted">Выберите ось, чтобы увидеть значения</span>
        ) : (
          <>
            <b>{labels[hot]}</b>
            <span className="dot-a">{a[hot] ?? 'н/д'}</span>
            <span className="muted">против</span>
            <span className="dot-b">{b[hot] ?? 'н/д'}</span>
          </>
        )}
      </figcaption>
    </figure>
  );
}
