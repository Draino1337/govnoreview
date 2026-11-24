import { useEffect, useState, type CSSProperties } from 'react';
import { useTween } from '../lib/hooks.ts';

// В DotGothic16 кириллица вдвое шире латиницы: шум для буквы берём той же ширины, иначе строка дёргается
const WIDE = 'АБВГДЖЗИКЛМНПРСТФХЦЧШЩЭЮЯ';
const NARROW = '#%&$@?!<>=+*/01';
const pick = (s: string) => s[(Math.random() * s.length) | 0];
const junk = (c: string) => (c === ' ' ? c : pick(/[а-яё]/i.test(c) ? WIDE : NARROW));
const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const noise = (text: string) => Array.from(text, junk).join('');

/** Текст «расшифровывается» из шума слева направо, а цветные копии рвутся полосами (стили .glitch.gx).
    Потом раз в несколько секунд слово снова двоится; под курсором — непрерывно. */
export function Glitch({ text, ms = 760 }: { text: string; ms?: number }) {
  const [out, setOut] = useState(() => (calm() ? text : noise(text)));
  useEffect(() => {
    if (calm()) return setOut(text);
    const chars = Array.from(text);
    // буква встаёт на место в свой момент: чем правее, тем позже, с небольшим разбросом
    const at = chars.map((_, i) => ms * (0.18 + 0.82 * ((i + Math.random() * 1.5) / (chars.length + 1.5))));
    const t0 = performance.now();
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      const t = now - t0;
      if (t >= ms) return setOut(text);
      // шум меняется ~20 раз в секунду, а не на каждом кадре — так он «щёлкает», как табло
      if (now - last > 50) {
        last = now;
        setOut(chars.map((c, i) => (t >= at[i] ? c : junk(c))).join(''));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, ms]);
  return (
    <span className="glitch gx" data-text={text}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{out}</span>
    </span>
  );
}

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
