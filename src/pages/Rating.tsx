import { useEffect, useRef, useState } from 'react';
import type { Phone } from '../types.ts';
import { PHONES, fullName, models, monthYear, pairPath } from '../lib/phones.ts';
import { analyze } from '../lib/analysis.ts';
import { overall, type CatId, type Scores } from '../lib/score.ts';
import { hrefOf } from '../router.ts';
import { Icon } from '../components/Icon.tsx';
import { Glitch } from '../components/Flip.tsx';
import { PhoneArt } from '../components/PhoneArt.tsx';

type TopId = 'all' | CatId;

/** вкладки рейтинга: общий и по категориям оценки (src/lib/score.ts) */
export const TOPS: { id: TopId; tab: string; icon: string; title: string; desc: string }[] = [
  { id: 'all', tab: 'Общий', icon: 'trophy', title: 'Лучшие смартфоны', desc: 'Итоговая оценка по всем категориям сразу' },
  { id: 'camera', tab: 'Камера', icon: 'camera', title: 'Лучшие камеры', desc: 'По оценке камеры DxOMARK; где DxOMARK не тестировал — по характеристикам' },
  { id: 'gaming', tab: 'Игры', icon: 'game', title: 'Лучшие для игр', desc: 'Графика и запас мощности в 3D' },
  { id: 'battery', tab: 'Автономность', icon: 'battery', title: 'Дольше всех без розетки', desc: 'Автономность и скорость зарядки' },
  { id: 'display', tab: 'Экран', icon: 'display', title: 'Лучшие экраны', desc: 'Яркость, чёткость, плавность и HDR' },
];

export const topOf = (slug: string) => TOPS.find((t) => t.id === slug) ?? TOPS[0];

/** сколько мест после пьедестала показывать до кнопки «Показать всех» */
const FOLD = 17;

const MEDALS = [
  { cls: 'gold', label: 'Король', icon: 'crown' },
  { cls: 'silver', label: 'Серебро', icon: 'trophy' },
  { cls: 'bronze', label: 'Бронза', icon: 'trophy' },
];

interface Row {
  p: Phone;
  s: Scores;
  score?: number;
  total: number;
}

function ranking(id: TopId): Row[] {
  return PHONES.map((p) => {
    const s = analyze(p).s;
    const total = overall(s);
    return { p, s, score: id === 'all' ? total : s[id], total };
  }).sort((x, y) => (y.score ?? -1) - (x.score ?? -1) || y.total - x.total || y.p.released.localeCompare(x.p.released));
}

const meta = (p: Phone) => `${p.brand} · ${monthYear(p.released)}`;

/** категории вкладок — их оценки показываем мелко в строке списка; ту, по которой сейчас рейтинг, подсвечиваем */
const CAT_TABS = TOPS.filter((t): t is (typeof TOPS)[number] & { id: CatId } => t.id !== 'all');

function Cats({ s, on }: { s: Scores; on: TopId }) {
  return (
    <span className="cats">
      {CAT_TABS.map((c) => (
        <span key={c.id} className={c.id === on ? 'cat is-on' : 'cat'} title={c.tab}>
          <Icon name={c.icon} size={12} />
          <b>{s[c.id] ?? '—'}</b>
        </span>
      ))}
    </span>
  );
}

/** Рейтинг смартфонов: пьедестал из трёх лучших и места ниже; вкладки меняют, по чему считать. */
export function Rating({ slug }: { slug: string }) {
  const top = topOf(slug);
  const rows = ranking(top.id);
  const [all, setAll] = useState(false);
  // на узком экране вкладки прокручиваются — выбранную показываем целиком
  const tabs = useRef<HTMLElement>(null);
  useEffect(() => {
    const on = tabs.current?.querySelector<HTMLElement>('.is-on');
    const box = tabs.current;
    if (on && box && box.scrollWidth > box.clientWidth)
      box.scrollLeft += on.getBoundingClientRect().left - box.getBoundingClientRect().left - (box.clientWidth - on.offsetWidth) / 2;
  }, []);
  // ссылка с места рейтинга — сравнение с лидером, у самого лидера — со вторым местом (если в каталоге он один — без ссылки)
  const link = (i: number) => {
    const p = rows[i].p;
    const r = rows[i === 0 ? 1 : 0]?.p;
    return r ? { href: hrefOf(pairPath(p.id, r.id)), title: `Сравнить с ${fullName(r)}` } : {};
  };
  const rest = rows.slice(3);
  const shown = all ? rest : rest.slice(0, FOLD);

  return (
    <div className="wrap rt">
      <header className="rt-head">
        <p className="label">Рейтинг смартфонов</p>
        <h1>
          <Glitch text={top.title} />
        </h1>
        <p className="rt-lead">
          {top.desc}. Все {models(rows.length)} каталога, оценка из 100.
        </p>
      </header>

      <nav className="rt-tabs" ref={tabs} aria-label="По чему считать рейтинг">
        {TOPS.map((t) => (
          <a key={t.id} href={hrefOf(`/rating/${t.id}`)} className={t.id === top.id ? 'is-on' : undefined} aria-current={t.id === top.id ? 'page' : undefined}>
            <Icon name={t.icon} size={16} />
            {t.tab}
          </a>
        ))}
      </nav>

      {/* тройка лучших — карточки цвета своей медали: золото, серебро, бронза */}
      <ol className="podium" aria-label="Тройка лучших">
        {rows.slice(0, 3).map((r, i) => (
          <li key={r.p.id} className={`pod pod-${i + 1} is-${MEDALS[i].cls}`}>
            <a className="pod-card px" {...link(i)}>
              <span className="pod-top">
                <b className="pod-rank">#{i + 1}</b>
                <span className="pod-medal">
                  <Icon name={MEDALS[i].icon} size={13} />
                  {MEDALS[i].label}
                </span>
              </span>
              <span className="pod-art">
                <PhoneArt phone={r.p} size={i === 0 ? 'md' : 'sm'} />
              </span>
              <span className="pod-name">{fullName(r.p)}</span>
              <span className="pod-meta">{meta(r.p)}</span>
              <span className="pod-score">
                <b>{r.score ?? 'н/д'}</b>
                <small>/100</small>
              </span>
              <span className="pod-meter" aria-hidden="true">
                <i style={{ width: `${r.score ?? 0}%` }} />
              </span>
            </a>
          </li>
        ))}
      </ol>

      <ol className="rt-list px" start={4} aria-label="Остальные места">
        {shown.map((r, k) => (
          <li key={r.p.id}>
            <a className="rt-row rv" {...link(k + 3)}>
              <span className="rt-rank">{k + 4}</span>
              <PhoneArt phone={r.p} size="xs" />
              <span className="rt-name">
                <b>{fullName(r.p)}</b>
                <small>{meta(r.p)}</small>
              </span>
              <Cats s={r.s} on={top.id} />
              <span className="rt-bar" aria-hidden="true">
                <i style={{ width: `${r.score ?? 0}%` }} />
              </span>
              <b className="rt-score">{r.score ?? 'н/д'}</b>
              <Icon name="arrow" size={16} />
            </a>
          </li>
        ))}
      </ol>
      {rest.length > FOLD && (
        <button type="button" className="cl-more" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? 'Свернуть' : `Показать всех: ещё ${rest.length - FOLD}`}
        </button>
      )}
      <p className="rt-note">Нажмите на модель, чтобы сравнить её с лидером рейтинга. Оценки считаются автоматически по характеристикам и замерам.</p>
    </div>
  );
}
