import { useEffect, useRef, useState } from 'react';

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Плавно ведёт число к target; при смене цели продолжает с текущего значения. */
export function useTween(target: number, ms = 700): number {
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
      cur.current = from + (target - from) * (1 - Math.pow(1 - k, 3));
      setV(cur.current);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
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

/** true, как только элемент хотя бы раз попал в окно просмотра. */
export function useInView<T extends Element>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === 'undefined' || reducedMotion()) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen] as const;
}

/** true, пока элемент виден (для плавающей панели выбора). */
export function useVisible<T extends Element>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, visible] as const;
}

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'));
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* приватный режим — не страшно */
    }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))] as const;
}
