import { useEffect, useRef, useState, type CSSProperties } from 'react';

const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Цифры 1–3 пиксельным шрифтом 5×7 — их «гравирует» на гранях постамента */
const DIGITS: Record<number, string[]> = {
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
};
const SOFT = ' .:-=+*'; // фон грани: от пустоты к блику
const HARD = '#@'; // цифра; @ — под бликом

/** псевдослучайное 0…1 по клетке — постоянная «зернистость» грани */
const hash = (x: number, y: number) => {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

const ease = (k: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);

/** ASCII-постамент: грань из символов в рамке, на ней крупная цифра места. При появлении растёт снизу вверх
    с «шумным» фронтом, потом по грани бегут диагональные блики. Рисует ~12 кадров в секунду и только
    пока виден; при «уменьшить движение» — один неподвижный кадр. */
export function Pedestal({ rank, delay = 0 }: { rank: 1 | 2 | 3; delay?: number }) {
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const el = ref.current!;
    const still = calm();
    let cols = 0, rows = 0, sx = 2, sy = 1, ox = 0, oy = 0;
    const glyph = DIGITS[rank];

    const measure = () => {
      const cs = getComputedStyle(el);
      const c = document.createElement('canvas').getContext('2d')!;
      c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const cw = c.measureText('M'.repeat(10)).width / 10 || 7;
      const lh = parseFloat(cs.lineHeight) || 12;
      cols = Math.max(7, Math.floor(el.clientWidth / cw));
      rows = Math.max(6, Math.floor(el.clientHeight / lh));
      // символ вдвое выше своей ширины, поэтому «пиксель» цифры — две клетки в ширину на одну в высоту
      sy = Math.max(1, Math.min(Math.floor((rows - 3) / 7), Math.floor((cols - 4) / 10)));
      sx = Math.min(sy * 2, Math.max(1, Math.floor((cols - 4) / 5)));
      ox = Math.floor((cols - 5 * sx) / 2);
      oy = 2 + Math.max(0, Math.floor((rows - 3 - 7 * sy) / 2));
    };

    const inDigit = (x: number, y: number) => {
      const gx = Math.floor((x - ox) / sx), gy = Math.floor((y - oy) / sy);
      return x >= ox && y >= oy && gx < 5 && gy < 7 && glyph[gy][gx] === '#';
    };

    const draw = (t: number) => {
      // сколько рядов уже «построено» снизу
      const k = still ? 1 : ease((t - delay) / 900);
      const built = Math.round(rows * k);
      let html = '';
      for (let y = 0; y < rows; y++) {
        const fromBottom = rows - y;
        if (fromBottom > built + 1) {
          html += ' '.repeat(cols) + '\n';
          continue;
        }
        const front = fromBottom === built + 1 && k < 1; // фронт стройки — случайный шум
        let line = '';
        for (let x = 0; x < cols; x++) {
          if (front) line += Math.random() < 0.5 ? HARD[(Math.random() * 2) | 0] : ' ';
          else if (y === 0) line += x === 0 || x === cols - 1 ? '+' : '=';
          else if (y === rows - 1) line += x === 0 || x === cols - 1 ? '+' : '-';
          else if (x === 0 || x === cols - 1) line += '|';
          else {
            // блик: диагональная полоса медленно проходит по грани слева направо
            const shine = still ? 0 : Math.max(0, Math.sin((x * 0.5 + y) * 0.32 - t * 0.0024)) ** 10;
            if (inDigit(x, y)) line += `<b>${HARD[shine > 0.4 ? 1 : 0]}</b>`;
            else if (inDigit(x - 1, y - 1) || inDigit(x - 2, y - 1)) line += '<i>%</i>'; // тень цифры
            else if (!still && Math.random() < 0.004) line += '*'; // искра
            else {
              const v = 0.06 + 0.3 * hash(x, y) * (1 - y / rows) + shine * 0.75;
              line += SOFT[Math.min(SOFT.length - 1, Math.floor(v * SOFT.length))];
            }
          }
        }
        html += line + '\n';
      }
      el.innerHTML = html;
    };

    measure();
    if (still) {
      draw(0);
      return;
    }
    let raf = 0, last = 0, seen = true;
    const t0 = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!seen || document.hidden || now - last < 80) return;
      last = now;
      draw(now - t0);
    };
    raf = requestAnimationFrame(tick);
    const io = new IntersectionObserver(([e]) => (seen = e.isIntersecting));
    io.observe(el);
    const ro = new ResizeObserver(() => {
      measure();
      draw(performance.now() - t0);
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, [rank, delay]);

  return <pre ref={ref} className="pdl" aria-hidden="true" />;
}

/** Число «прокручивается» случайными цифрами и встаёт на место слева направо, как табло. */
export function Roll({ value, delay = 0, ms = 900 }: { value: number | undefined; delay?: number; ms?: number }) {
  const text = value === undefined ? 'н/д' : String(value);
  const [out, setOut] = useState(() => (calm() ? text : text.replace(/\d/g, '0')));
  useEffect(() => {
    if (calm()) return setOut(text);
    const t0 = performance.now() + delay;
    const id = setInterval(() => {
      const t = performance.now() - t0;
      if (t < 0) return;
      if (t >= ms) {
        clearInterval(id);
        return setOut(text);
      }
      const done = Math.floor((t / ms) * (text.length + 1));
      setOut(Array.from(text, (c, i) => (i < done || !/\d/.test(c) ? c : String((Math.random() * 10) | 0))).join(''));
    }, 45);
    return () => clearInterval(id);
  }, [text, delay, ms]);
  return (
    <span className="roll" style={{ minWidth: `${text.length}ch` }}>
      {out}
    </span>
  );
}

/** Шкала из символов: █ — набрано, ░ — осталось. Заполнение «печатается» при появлении строки (.rv). */
export function Bar({ value, cells = 20 }: { value: number | undefined; cells?: number }) {
  const n = Math.round(((value ?? 0) / 100) * cells);
  return (
    <span className="abar" aria-hidden="true" style={{ '--n': n } as CSSProperties}>
      <span className="abar-bg">{'░'.repeat(cells)}</span>
      <span className="abar-fg">{'█'.repeat(n)}</span>
    </span>
  );
}
