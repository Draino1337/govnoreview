import { useEffect, useMemo, useRef, useState } from 'react';
import type { Phone } from '../types.ts';
import { analyze, type Analysis } from '../lib/analysis.ts';
import { PHONES, chipset, fullName, monthYear, pairPath, shortName } from '../lib/phones.ts';
import { CATS, overall, valueIndex, valueLabel } from '../lib/score.ts';
import { buildSpecs } from '../lib/specs.ts';
import { introText, keyDiffs, verdictText } from '../lib/insights.ts';
import { go, hrefOf } from '../router.ts';
import { Card } from '../components/Card.tsx';
import { ChipLogo } from '../components/ChipLogo.tsx';
import { DuelBar } from '../components/DuelBar.tsx';
import { Icon } from '../components/Icon.tsx';
import { Legend } from '../components/Legend.tsx';
import { PhoneArt } from '../components/PhoneArt.tsx';
import { PhoneSearch } from '../components/PhoneSearch.tsx';
import { Radar } from '../components/Radar.tsx';
import { Ring } from '../components/Ring.tsx';
import { SpecTable } from './compare/Specs.tsx';
import { BatteryCard, BenchCard, CameraCard } from './compare/Bench.tsx';
import { ScreenCard } from './compare/Screen.tsx';

const NAV: [id: string, label: string][] = [
  ['diff', 'Отличия'],
  ['screen', 'Экран'],
  ['overview', 'Обзор'],
  ['specs', 'Характеристики'],
  ['bench', 'Бенчмарки'],
  ['battery', 'Автономность'],
  ['camera', 'Камеры'],
];

function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-130px 0px -60% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);
  return active;
}

interface SideProps {
  p: Phone;
  an: Analysis;
  score: number;
  accent: 'a' | 'b';
  leader: boolean;
  onPick: (p: Phone) => void;
}

function Side({ p, an, score, accent, leader, onPick }: SideProps) {
  const [editing, setEditing] = useState(false);
  return (
    <div className={`side side-${accent}`}>
      <Ring value={score} color={`var(--${accent})`} leader={leader} />
      <PhoneArt phone={p} lenses={an.m.lenses} size="lg" interactive />
      <h2 className="side-name">{shortName(p)}</h2>
      <p className="side-meta">
        {p.brand} · {p.tier} · {monthYear(p.released)}
      </p>
      <p className="side-chip">
        <ChipLogo chip={chipset(p)} size={44} />
        {chipset(p)}
      </p>
      <p className="side-price">
        ${p.price} <small>при выходе</small>
      </p>
      {editing ? (
        <PhoneSearch
          label="Заменить смартфон"
          accent={accent}
          value={null}
          autoFocus
          onChange={(x) => {
            if (x) onPick(x);
            setEditing(false);
          }}
          onDismiss={() => setEditing(false)}
        />
      ) : (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
          <Icon name="search" size={15} />
          Сменить
        </button>
      )}
    </div>
  );
}

function ValueCard({ a, b, A, B }: { a: Phone; b: Phone; A: Analysis; B: Analysis }) {
  const [pa, setPa] = useState(String(a.price));
  const [pb, setPb] = useState(String(b.price));
  const va = valueIndex(overall(A.s), Number(pa));
  const vb = valueIndex(overall(B.s), Number(pb));
  const box = (p: Phone, v: string, set: (s: string) => void, idx: number, accent: 'a' | 'b') => (
    <div className={`val val-${accent}`}>
      <b className="val-name">{shortName(p)}</b>
      <label className="money">
        <span>$</span>
        <input type="number" inputMode="decimal" min={1} step={10} value={v} onChange={(e) => set(e.target.value)} aria-label={`Цена ${shortName(p)}, доллары`} />
      </label>
      <Ring value={idx} color={`var(--${accent})`} size={112} caption={valueLabel(idx)} />
      <button type="button" className="link-btn" onClick={() => set(String(p.price))}>
        цена при выходе: ${p.price}
      </button>
    </div>
  );
  return (
    <Card id="value" icon="tag" title="Цена / качество" desc="Бета: введите актуальные цены — индекс пересчитается сразу">
      <div className="val-grid">
        {box(a, pa, setPa, va, 'a')}
        <div className="val-vs">VS</div>
        {box(b, pb, setPb, vb, 'b')}
      </div>
      <p className="foot">Индекс растёт вместе с итоговой оценкой и падает с ростом цены. Это упрощённая модель, а не рекомендация к покупке.</p>
    </Card>
  );
}

function Rivals({ p, other }: { p: Phone; other: Phone }) {
  const mine = overall(analyze(p).s);
  const list = PHONES.filter((x) => x.id !== p.id && x.id !== other.id)
    .sort((x, y) => Math.abs(overall(analyze(x).s) - mine) - Math.abs(overall(analyze(y).s) - mine))
    .slice(0, 4);
  return (
    <div className="rivals-col">
      <h3>{shortName(p)} против…</h3>
      <ul>
        {list.map((x) => (
          <li key={x.id}>
            <a href={hrefOf(pairPath(p.id, x.id))}>
              <PhoneArt phone={x} size="xs" />
              <span>{shortName(x)}</span>
              <em>{overall(analyze(x).s)}</em>
              <Icon name="arrow" size={16} />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Compare({ a, b }: { a: Phone; b: Phone }) {
  const A = analyze(a);
  const B = analyze(b);
  const [swapping, setSwapping] = useState(false);
  const [toast, setToast] = useState('');
  const timer = useRef(0);

  const specs = useMemo(() => buildSpecs(a, b), [a, b]);
  const diffs = useMemo(() => keyDiffs(A.m, B.m), [A, B]);
  const spyIds = useMemo(() => NAV.map((n) => n[0]), []);
  const active = useScrollSpy(spyIds);

  const scoreA = overall(A.s);
  const scoreB = overall(B.s);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const pick = (side: 'a' | 'b', p: Phone) => {
    const [x, y] = side === 'a' ? [p, b] : [a, p];
    go(x.id === y.id ? (side === 'a' ? pairPath(p.id, a.id) : pairPath(b.id, p.id)) : pairPath(x.id, y.id));
  };
  const swap = () => {
    setSwapping(true);
    window.setTimeout(() => {
      go(pairPath(b.id, a.id));
      setSwapping(false);
    }, 280);
  };
  const flash = (t: string) => {
    setToast(t);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(''), 2400);
  };
  const share = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      flash('Ссылка скопирована');
    } catch {
      flash('Скопируйте ссылку из адресной строки');
    }
  };
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const col = (p: Phone, items: string[], accent: 'a' | 'b') => (
    <div className={`diff-col is-${accent}`}>
      <h3>
        Причины выбрать <span>{fullName(p)}</span>
      </h3>
      {items.length ? (
        <ul>
          {items.map((t) => (
            <li key={t}>
              <Icon name="check" size={16} />
              {t}
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">Заметных преимуществ перед соперником не нашлось.</p>
      )}
    </div>
  );

  return (
    <div className="wrap compare">
      <div className="crumbs">
        <a href={hrefOf('/')} className="btn btn-ghost btn-sm">
          <Icon name="back" size={15} />
          Новое сравнение
        </a>
        <button type="button" className="btn btn-ghost btn-sm" onClick={share}>
          <Icon name="link" size={15} />
          Поделиться
        </button>
      </div>

      <section className="card hero">
        <h1 className="sr-only">
          {fullName(a)} против {fullName(b)}
        </h1>
        <div className={`hero-grid${swapping ? ' is-swapping' : ''}`}>
          <Side p={a} an={A} score={scoreA} accent="a" leader={scoreA > scoreB} onPick={(p) => pick('a', p)} />
          <div className="vs">
            <span>VS</span>
            <button type="button" className="swap" onClick={swap} aria-label="Поменять смартфоны местами" title="Поменять местами">
              <Icon name="swap" size={18} />
            </button>
          </div>
          <Side p={b} an={B} score={scoreB} accent="b" leader={scoreB > scoreA} onPick={(p) => pick('b', p)} />
        </div>
        <p className="hero-intro">{introText(a, b, A.m, B.m)}</p>
      </section>

      <nav className="subnav" aria-label="Разделы сравнения">
        <div className="subnav-pills">
          {NAV.map(([id, label]) => (
            <button key={id} type="button" className={active === id ? 'is-on' : ''} onClick={() => jump(id)}>
              {label}
            </button>
          ))}
        </div>
        <Legend a={a} b={b} />
      </nav>

      <Card id="diff" icon="scale" title="Ключевые отличия" desc="Главные преимущества каждого из устройств">
        <div className="diff-grid">
          {col(a, diffs.a, 'a')}
          {col(b, diffs.b, 'b')}
        </div>
      </Card>

      <ScreenCard a={a} b={b} />

      <Card id="overview" icon="display" title="Обзор" desc="Оценки по категориям и итоговая оценка">
        <Legend a={a} b={b} />
        <div className="ov">
          <div className="ov-cats">
            {CATS.map((c) => (
              <DuelBar key={c.id} label={c.title} sub={c.desc} a={A.s[c.id]} b={B.s[c.id]} max={100} fmt={(n) => String(n)} />
            ))}
          </div>
          <Radar labels={CATS.map((c) => c.title)} a={CATS.map((c) => A.s[c.id])} b={CATS.map((c) => B.s[c.id])} nameA={shortName(a)} nameB={shortName(b)} />
        </div>
        <div className="final">
          <DuelBar label="Итоговая оценка" a={scoreA} b={scoreB} max={100} fmt={(n) => String(n)} />
        </div>
        <p className="foot">Оценки считаются автоматически по характеристикам и замерам — это не экспертное мнение. Камера — по оценке DxOMARK, а где её нет — по характеристикам.</p>
      </Card>

      <ValueCard key={a.id + b.id} a={a} b={b} A={A} B={B} />

      <SpecTable sections={specs} a={a} b={b} />
      <BenchCard a={a} b={b} ma={A.m} mb={B.m} />
      <BatteryCard a={a} b={b} ma={A.m} mb={B.m} />
      <CameraCard a={a} b={b} ma={A.m} mb={B.m} sections={specs} />

      <Card id="verdict" icon="trophy" title="Итоги" desc="Что выбрать и с чем сравнить ещё">
        <p className="verdict">{verdictText(a, b, A.s, B.s)}</p>
        <div className="rivals">
          <Rivals p={a} other={b} />
          <Rivals p={b} other={a} />
        </div>
      </Card>

      <div className={`toast${toast ? ' is-on' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}
