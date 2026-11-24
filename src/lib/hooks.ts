import { useEffect, useRef, useState } from 'react';

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Плавно ведёт число к target; при смене цели продолжает с текущего значения. */
export function useTween(target: number, ms = 700, pow = 3): number {
  const [v, setV] = useState(() => (reducedMotion() ? target : 0));
  const cur = useRef(v);
  useEffect(() => {
    if (reducedMotion()) {
      cur.current = target;
      setV(target);
      return;
    }
    const from = cur.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      // метка кадра rAF может быть чуть раньше t0 — не даём прогрессу уйти в минус
      const k = Math.max(0, Math.min(1, (t - t0) / ms));
      cur.current = from + (target - from) * (1 - Math.pow(1 - k, pow));
      setV(cur.current);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, pow]);
  return v;
}

/** То же для массива фиксированной длины (радар). */
export function useTweenArray(target: number[], ms = 700): number[] {
  const key = target.join(',');
  const [v, setV] = useState<number[]>(() => (reducedMotion() ? target : target.map(() => 0)));
  const cur = useRef(v);
  useEffect(() => {
    if (reducedMotion()) {
      cur.current = target;
      setV(target);
      return;
    }
    const from = cur.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.max(0, Math.min(1, (t - t0) / ms));
      const e = 1 - Math.pow(1 - k, 3);
      cur.current = target.map((x, i) => (from[i] ?? 0) + (x - (from[i] ?? 0)) * e);
      setV(cur.current);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ms]);
  return v;
}
