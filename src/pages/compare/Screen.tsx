import type { Phone } from '../../types.ts';
import { shortName } from '../../lib/phones.ts';
import { Card } from '../../components/Card.tsx';

interface Scr {
  diag: number;
  w: number; // ширина и высота экрана в дюймах (портретно)
  h: number;
  r: number; // радиус скругления углов экрана, дюймы
  ratio: string;
  cm2: number;
}

/* Радиус углов в данных нет — задаём долей ширины экрана по модели:
   iPhone с X — около 14% (55 pt при ширине 393 pt), старые iPhone и SE — прямые углы;
   Galaxy S Ultra — почти острые; внутренний экран Fold — чуть скруглён;
   остальные — около 10%, до безрамочных экранов (осень 2017) углы прямые. */
function cornerShare(p: Phone): number {
  const modern = p.released >= '2017-10';
  // iPhone X вышел одновременно с 8 — старые модели перечисляем, а не отсекаем по дате
  if (p.brand === 'Apple') return /iphone-(2g|3gs?|4s?|5[sc]?|[678](s)?(-plus)?|se-\d+)$/.test(p.id) ? 0 : 0.14;
  if (/galaxy-s\d+-ultra/.test(p.id)) return 0.025;
  if (/galaxy-z-fold/.test(p.id)) return 0.04;
  return modern && p.id !== 'google-pixel-2' ? 0.1 : 0;
}

// площадь по диагонали и разрешению: стороны экрана относятся как пиксели
function screen(p: Phone): Scr | null {
  const g = (label: string) => p.rows.find((r) => r[0] === 'Экран' && r[2] === label)?.[3];
  const diag = parseFloat(g('Размер') ?? '');
  const px = g('Разрешение')?.match(/(\d+)\s*x\s*(\d+)/);
  if (!diag || !px) return null;
  const [lo, hi] = [+px[1], +px[2]].sort((x, y) => x - y);
  const k = hi / lo;
  const w = diag / Math.hypot(1, k);
  const h = w * k;
  // складные почти квадратные — для них «1.04:1» понятнее, чем «9.3:9»
  const ratio = k < 1.5 ? `${k.toFixed(2)}:1` : `${+(k * 9).toFixed(1)}:9`;
  const r = w * cornerShare(p);
  // скруглённые углы срезают от прямоугольника (4 − π)·r²
  return { diag, w, h, r, ratio, cm2: (w * h - (4 - Math.PI) * r * r) * 6.4516 };
}

export function ScreenCard({ a, b }: { a: Phone; b: Phone }) {
  const sa = screen(a);
  const sb = screen(b);
  if (!sa || !sb) return null;

  const wMax = Math.max(sa.w, sb.w);
  const hMax = Math.max(sa.h, sb.h);
  const bigB = sb.cm2 > sa.cm2;
  const [big, small] = bigB ? [sb, sa] : [sa, sb];
  const pct = Math.round((big.cm2 / small.cm2 - 1) * 100);
  const rect = (s: Scr, accent: 'a' | 'b', front: boolean) => (
    <div
      className={`scr-rect is-${accent}${front ? ' is-front' : ''}`}
      style={{
        width: `${(s.w / wMax) * 100}%`,
        height: `${(s.h / hMax) * 100}%`,
        // проценты радиуса считаются от своей стороны: по горизонтали от ширины, по вертикали от высоты — угол остаётся круглым
        borderRadius: `${(s.r / s.w) * 100}% / ${(s.r / s.h) * 100}%`,
      }}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1="100" x2="100" y2="0" vectorEffect="non-scaling-stroke" />
      </svg>
      <span>{s.diag}″</span>
    </div>
  );
  const item = (p: Phone, s: Scr, accent: 'a' | 'b') => (
    <li className={`scr-item is-${accent}`}>
      <b>{shortName(p)}</b>
      <span>
        {s.diag}″ · {s.ratio} · {Math.round(s.cm2)} см²
      </span>
    </li>
  );

  return (
    <Card id="screen" icon="display" title="Площадь экрана" desc="Экраны в одном масштабе: диагональ и соотношение сторон">
      <div className="scr">
        <ul className="scr-legend">
          {item(a, sa, 'a')}
          {item(b, sb, 'b')}
        </ul>
        <figure className="scr-fig">
          <div className="scr-stage rv" style={{ aspectRatio: `${wMax} / ${hMax}` }}>
            {rect(big, bigB ? 'b' : 'a', false)}
            {rect(small, bigB ? 'a' : 'b', true)}
          </div>
          <figcaption>
            {pct < 1 ? (
              'Площадь экранов почти одинаковая'
            ) : (
              <>
                У {shortName(bigB ? b : a)} экран больше{' '}
                {/* от двукратной разницы «на 111%» читается хуже, чем «в 2,1 раза» */}
                <b className={bigB ? 'is-b' : 'is-a'}>{pct >= 100 ? `в ${(big.cm2 / small.cm2).toFixed(1).replace('.', ',')} раза` : `на ≈${pct}%`}</b>
              </>
            )}
          </figcaption>
        </figure>
      </div>
    </Card>
  );
}
