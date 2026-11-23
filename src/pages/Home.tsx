import { useState } from 'react';
import type { Phone } from '../types.ts';
import { monthYear, pairPath } from '../lib/phones.ts';
import { analyze } from '../lib/analysis.ts';
import { overall } from '../lib/score.ts';
import { go } from '../router.ts';
import { Icon } from '../components/Icon.tsx';
import { PhoneArt } from '../components/PhoneArt.tsx';
import { PhoneSearch } from '../components/PhoneSearch.tsx';
import { Changelog } from '../components/Changelog.tsx';
import { CHANGELOG } from '../data/changelog.ts';

interface SlotProps {
  label: string;
  accent: 'a' | 'b';
  value: Phone | null;
  exclude?: string;
  onChange: (p: Phone | null) => void;
}

/** Слот выбора: витрина с фото выбранного телефона и поиск под ней. Клик по витрине открывает поиск. */
function Slot({ label, accent, value, exclude, onChange }: SlotProps) {
  return (
    <div className={`slot slot-${accent}${value ? ' is-set' : ''}`}>
      <p className="slot-tag" aria-hidden="true">
        <i />
        {label}
      </p>
      <div
        className="slot-stage"
        aria-hidden="true"
        onMouseDown={(e) => {
          e.preventDefault();
          e.currentTarget.parentElement?.querySelector('input')?.focus();
        }}
      >
        {value ? (
          <div className="slot-phone" key={value.id}>
            <PhoneArt phone={value} size="sm" />
            <b className="slot-score" title="Итоговая оценка из 100">
              {overall(analyze(value).s)}
            </b>
          </div>
        ) : (
          <div className="slot-ghost">
            <span>
              <Icon name="plus" size={22} />
            </span>
            Выбрать модель
          </div>
        )}
      </div>
      <p className="slot-meta" aria-hidden="true">
        {value ? `${value.brand} · ${monthYear(value.released)}${value.price ? ` · $${value.price}` : ''}` : 'Поиск по названию или бренду'}
      </p>
      <PhoneSearch label={label} accent={accent} value={value} exclude={exclude} onChange={onChange} />
    </div>
  );
}

/** Главный экран: первый экран — заголовок и выбор двух телефонов, ниже — Changelog каталога. */
export function Home() {
  // оба слота в одном состоянии — быстрые выборы подряд не затирают друг друга
  const [[a, b], setSlots] = useState<[Phone | null, Phone | null]>([null, null]);

  const ready = !!a && !!b && a.id !== b.id;
  const submit = () => ready && go(pairPath(a!.id, b!.id));
  // модель из Changelog встаёт в первый свободный слот (если оба заняты — во второй)
  const add = (p: Phone) => {
    setSlots(([x, y]) => (x?.id === p.id || y?.id === p.id ? [x, y] : !x ? [p, y] : [x, p]));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="wrap home">
      <div className="home-first">
        <section className="home-hero">
          <p className="eyebrow">
            <Icon name="scale" size={15} />
            Сравнение смартфонов
          </p>
          <h1>
            Наноревью <span className="rainbow">хуйня</span>
          </h1>
          <p className="lead">Характеристики, замеры, автономность и камеры бок о бок.</p>

          <div className="card picker">
            <Slot label="Первый смартфон" accent="a" value={a} exclude={b?.id} onChange={(p) => setSlots(([, y]) => [p, y])} />
            <div className={`picker-vs${ready ? ' is-ready' : ''}`} aria-hidden="true">
              <span>VS</span>
            </div>
            <Slot label="Второй смартфон" accent="b" value={b} exclude={a?.id} onChange={(p) => setSlots(([x]) => [x, p])} />
            <div className="picker-actions">
              <button type="button" className="btn btn-primary picker-go" disabled={!ready} onClick={submit}>
                {ready ? 'Сравнить' : !a && !b ? 'Выберите два смартфона' : 'Выберите ещё один'}
                <Icon name="arrow" size={18} />
              </button>
            </div>
          </div>
        </section>

        <a className="cl-teaser" href="#cl" onClick={(e) => (e.preventDefault(), document.getElementById('cl')?.scrollIntoView({ behavior: 'smooth' }))}>
          <span className="cl-new">Новое</span>
          {CHANGELOG[0].title}
          <Icon name="arrow" size={16} />
        </a>

        <p className="home-note">Данные собраны из открытых источников, оценки считаются автоматически и не являются экспертным мнением.</p>
      </div>

      <Changelog onPick={add} />
    </div>
  );
}
