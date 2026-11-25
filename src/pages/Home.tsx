import { useState, type CSSProperties } from 'react';
import type { Phone } from '../types.ts';
import { PHONES, monthYear, pairPath } from '../lib/phones.ts';
import { analyze } from '../lib/analysis.ts';
import { overall } from '../lib/score.ts';
import { go, hrefOf } from '../router.ts';
import { Icon } from '../components/Icon.tsx';
import { PhoneArt } from '../components/PhoneArt.tsx';
import { PhoneSearch } from '../components/PhoneSearch.tsx';
import { Changelog } from '../components/Changelog.tsx';
import { LogoMark, toNews } from '../components/Brand.tsx';
import { Flip, Count } from '../components/Flip.tsx';

const BRANDS = new Set(PHONES.map((p) => p.brand)).size;

interface SlotProps {
  n: number;
  label: string;
  accent: 'a' | 'b';
  value: Phone | null;
  exclude?: string;
  onChange: (p: Phone | null) => void;
}

/** Слот выбора: витрина-«видоискатель» с фото выбранного телефона и поиск под ней. Клик по витрине открывает поиск.
    Пустой слот — силуэт телефона, по которому бежит луч сканера; при выборе рамка прицела защёлкивается,
    телефон падает на подсвеченную площадку, а оценка набегает от нуля. */
function Slot({ n, label, accent, value, exclude, onChange }: SlotProps) {
  return (
    <div className={`slot slot-${accent} px px-well${value ? ' is-set' : ''}`}>
      <p className="slot-tag" aria-hidden="true">
        <i />
        {label}
        <b className="slot-n">0{n}</b>
      </p>
      <div
        className="slot-stage"
        aria-hidden="true"
        onMouseDown={(e) => {
          e.preventDefault();
          e.currentTarget.parentElement?.querySelector('input')?.focus();
        }}
      >
        <i className="slot-aim" key={`aim-${value?.id ?? ''}`} />
        {value ? (
          <div className="slot-phone" key={value.id}>
            <PhoneArt phone={value} size="sm" />
            <b className="slot-score" title="Итоговая оценка из 100">
              <Count value={overall(analyze(value).s)} ms={900} />
            </b>
          </div>
        ) : (
          <div className="slot-ghost">
            <span className="slot-sil">
              <i className="slot-scan" />
            </span>
            Выбрать модель
          </div>
        )}
        <i className="slot-floor" />
      </div>
      <p className="slot-meta" aria-hidden="true">
        {value ? `${value.brand} · ${monthYear(value.released)}${value.price ? ` · $${value.price}` : ''}` : 'поиск по названию или бренду'}
      </p>
      <PhoneSearch label={label} accent={accent} value={value} exclude={exclude} onChange={onChange} />
    </div>
  );
}

/** Главный экран: слева заголовок и счётчики, справа «окно» выбора двух телефонов; ниже — лента «Что нового». */
export function Home() {
  // оба слота в одном состоянии — быстрые выборы подряд не затирают друг друга
  const [[a, b], setSlots] = useState<[Phone | null, Phone | null]>([null, null]);

  const ready = !!a && !!b && a.id !== b.id;
  const submit = () => ready && go(pairPath(a!.id, b!.id));
  // модель из ленты встаёт в первый свободный слот (если оба заняты — во второй)
  const add = (p: Phone) => {
    setSlots(([x, y]) => (x?.id === p.id || y?.id === p.id ? [x, y] : !x ? [p, y] : [x, p]));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="home">
      <section className="home-first">
        <div className="hero-copy">
          <p className="label rv">Сравнение смартфонов</p>
          <h1 className="hero-title">
            <Flip text="Nanoreview" delay={0.05} step={0.025} first="hero-n" />{' '}
            <span className="dither">
              <span className="glitch" data-text="хуйня">
                <Flip text="хуйня" delay={0.28} step={0.04} />
              </span>
              <i className="caret" aria-hidden="true" />
            </span>
          </h1>
          <p className="lead rv" style={{ '--rv-delay': '0.08s' } as CSSProperties}>
            Характеристики, замеры, автономность и камеры бок о бок.
          </p>
          <div className="hero-cta rv" style={{ '--rv-delay': '0.13s' } as CSSProperties}>
            <a className="btn btn-primary hero-btn" href={hrefOf('/rating')}>
              <Icon name="trophy" size={22} />
              Рейтинг
            </a>
            <div className="hero-stat">
              <b>
                <Count value={PHONES.length} ms={3400} />
              </b>
              <small>смартфонов</small>
            </div>
            <div className="hero-stat">
              <b>
                <Count value={BRANDS} ms={3000} />
              </b>
              <small>брендов</small>
            </div>
          </div>
          <p className="hero-src rv" style={{ '--rv-delay': '0.17s' } as CSSProperties}>
            данные: GSMArena · DxOMARK
          </p>
        </div>

        <div className="win px px-raised rv" style={{ '--rv-delay': '0.05s' } as CSSProperties}>
          <div className="win-bar">
            <LogoMark size={14} />
            <span>govnoreview — сравнение</span>
            <span className="win-stat" aria-hidden="true">
              <i className={a ? 'is-a' : undefined} />
              <i className={b ? 'is-b' : undefined} />
              {(a ? 1 : 0) + (b ? 1 : 0)}/2
            </span>
          </div>
          <i className="win-scan" aria-hidden="true" />
          <div className="picker">
            <Slot n={1} label="Первый" accent="a" value={a} exclude={b?.id} onChange={(p) => setSlots(([, y]) => [p, y])} />
            <div className={`picker-vs${ready ? ' is-ready' : ''}`} aria-hidden="true">
              <i />
              <b key={String(ready)}>VS</b>
              <i />
            </div>
            <Slot n={2} label="Второй" accent="b" value={b} exclude={a?.id} onChange={(p) => setSlots(([x]) => [x, p])} />
          </div>
          <div className="win-foot">
            <button type="button" className="btn btn-primary picker-go" disabled={!ready} onClick={submit}>
              {ready ? 'Сравнить' : !a && !b ? 'Выберите два смартфона' : 'Выберите ещё один'}
              <Icon name="arrow" size={18} />
            </button>
          </div>
        </div>

        <a className="hero-down" href="#cl" onClick={toNews} aria-label="К ленте «Что нового»">
          <Icon name="chevron" size={18} />
          <Icon name="chevron" size={18} />
        </a>
      </section>

      <Changelog onPick={add} />
    </div>
  );
}
