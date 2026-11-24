import type { CSSProperties } from 'react';
import { useTween } from '../lib/hooks.ts';

/** Текст, буквы которого «перещёлкиваются» на место по очереди: сверху вниз с лёгким отскоком.
    Экранный диктор читает слово целиком, а не по буквам. */
export function Flip({ text, delay = 0, step = 0.035 }: { text: string; delay?: number; step?: number }) {
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {Array.from(text).map((ch, i) => (
          <span key={i} className="fl" style={{ animationDelay: `${delay + i * step}s` } as CSSProperties}>
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}
      </span>
    </>
  );
}

/** Число, которое набегает от нуля до значения — ровно, лишь слегка притормаживая к концу.
    Ширина сразу под итоговое число — соседи не сдвигаются. */
export function Count({ value, ms = 1400 }: { value: number; ms?: number }) {
  return <span style={{ display: 'inline-block', minWidth: `${String(value).length}ch` }}>{Math.round(useTween(value, ms, 1.7))}</span>;
}
