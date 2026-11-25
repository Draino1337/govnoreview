import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Phone } from '../types.ts';
import { PHONES, fullName, models, monthYear, pairPath } from '../lib/phones.ts';
import { analyze } from '../lib/analysis.ts';
import { overall, type CatId, type Scores } from '../lib/score.ts';
import { go, hrefOf } from '../router.ts';
import { Icon } from '../components/Icon.tsx';
import { Glitch } from '../components/Flip.tsx';
import { PhoneArt } from '../components/PhoneArt.tsx';
import { Bar, Pedestal, Roll } from '../components/Ascii.tsx';

type TopId = 'all' | CatId;

/** команда в «терминале» над заголовком — у каждой вкладки своя */
const CMD: Partial<Record<TopId, string>> = {
  all: 'govno rank --all',
  camera: 'govno rank --by camera',
  gaming: 'govno rank --by gaming',
  battery: 'govno rank --by battery',
  display: 'govno rank --by display',
};

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
  // клавиши 1–5 переключают вкладки (цифры подписаны на самих вкладках)
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = TOPS[Number(e.key) - 1];
      if (!t || e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement).closest('input, textarea, [contenteditable]')) return;
      go(`/rating/${t.id}`);
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
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
        <p className="rt-cmd" aria-hidden="true">
          <span className="rt-ps">~/govnoreview $</span>
          <span className="rt-type" style={{ '--n': (CMD[top.id] ?? 'govno rank').length } as CSSProperties}>
            {(CMD[top.id] ?? 'govno rank')}
          </span>
          <i className="rt-caret" />
        </p>
        <h1>
          <Glitch text={top.title} />
        </h1>
        <p className="rt-lead">
          {top.desc}. Все {models(rows.length)} каталога, оценка из 100.
        </p>
      </header>

      <nav className="rt-tabs" ref={tabs} aria-label="По чему считать рейтинг">
        {TOPS.map((t, i) => (
          <a key={t.id} href={hrefOf(`/rating/${t.id}`)} className={t.id === top.id ? 'is-on' : undefined} aria-current={t.id === top.id ? 'page' : undefined}>
            <kbd aria-hidden="true">{i + 1}</kbd>
            <Icon name={t.icon} size={15} />
            {t.tab}
          </a>
        ))}
      </nav>

      {/* тройка лучших стоит на ASCII-постаментах: король в центре и выше всех */}
      <ol className="podium" aria-label="Тройка лучших">
        {rows.slice(0, 3).map((r, i) => (
          <li key={r.p.id} className={`pod pod-${i + 1} is-${MEDALS[i].cls}`}>
            <a className="pod-card" {...link(i)}>
              <span className="pod-art">
                <PhoneArt phone={r.p} size={i === 0 ? 'md' : 'sm'} />
              </span>
              <span className="pod-medal">
                <Icon name={MEDALS[i].icon} size={12} />
                {MEDALS[i].label}
              </span>
              <span className="pod-name">{fullName(r.p)}</span>
              <span className="pod-meta">{meta(r.p)}</span>
              <span className="pod-score">
                <b>
                  <Roll value={r.score} delay={[650, 500, 800][i]} />
                </b>
                <small>/100</small>
              </span>
              <Pedestal rank={(i + 1) as 1 | 2 | 3} delay={[600, 450, 750][i]} />
            </a>
          </li>
        ))}
      </ol>

      <div className="rt-board px">
        <p className="rt-thead" aria-hidden="true">
          <span>#</span>
          <span />
          <span>модель</span>
          <span className="rt-th-cats">категории</span>
          <span className="rt-th-bar">шкала</span>
          <span>балл</span>
          <span />
        </p>
        <ol className="rt-list" start={4} aria-label="Остальные места">
          {shown.map((r, k) => (
            <li key={r.p.id}>
              <a className="rt-row rv" {...link(k + 3)}>
                <span className="rt-rank">{String(k + 4).padStart(2, '0')}</span>
                <PhoneArt phone={r.p} size="xs" />
                <span className="rt-name">
                  <b>{fullName(r.p)}</b>
                  <small>{meta(r.p)}</small>
                </span>
                <Cats s={r.s} on={top.id} />
                <Bar value={r.score} />
                <b className="rt-score">{r.score ?? 'н/д'}</b>
                <span className="rt-go" aria-hidden="true">
                  -&gt;
                </span>
              </a>
            </li>
          ))}
        </ol>
      </div>
      {rest.length > FOLD && (
        <button type="button" className="rt-more" aria-expanded={all} onClick={() => setAll(!all)}>
          <span aria-hidden="true">{all ? '[ - ]' : '[ + ]'}</span>
          {all ? 'Свернуть' : `Показать всех: ещё ${rest.length - FOLD}`}
        </button>
      )}
      <p className="rt-note">Нажмите на модель, чтобы сравнить её с лидером рейтинга. Оценки считаются автоматически по характеристикам и замерам.</p>
    </div>
  );
}
