import { useState } from 'react';
import type { Phone } from '../types.ts';
import { CHANGELOG } from '../data/changelog.ts';
import { byId, fullName, models } from '../lib/phones.ts';
import { PhoneArt } from './PhoneArt.tsx';
import { Icon } from './Icon.tsx';
import { hrefOf } from '../router.ts';

/** сколько моделей показывать в записи до кнопки «Показать все» */
const FOLD = 12;

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const dateRu = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

function Entry({ e, latest, onPick }: { e: (typeof CHANGELOG)[number]; latest: boolean; onPick: (p: Phone) => void }) {
  const [all, setAll] = useState(false);
  const phones = e.ids.map((id) => byId.get(id)).filter((p): p is Phone => !!p);
  const shown = all ? phones : phones.slice(0, FOLD);

  return (
    <li className={`cl-item${latest ? ' is-latest' : ''}`}>
      <span className="cl-dot" aria-hidden="true" />
      <article className="card cl-card">
        <header className="cl-head">
          <span className="cl-ver">v{e.version}</span>
          {latest && <span className="cl-new">Новое</span>}
          <time dateTime={e.date}>{dateRu(e.date)}</time>
          {phones.length > 0 && <span className="cl-count">+{models(phones.length)}</span>}
        </header>
        <h3>{e.title}</h3>
        <p>{e.text}</p>
        {e.link && (
          <a className="btn btn-primary cl-link" href={hrefOf(e.link.path)}>
            {e.link.label}
            <Icon name="arrow" size={18} />
          </a>
        )}
        {phones.length > 0 && <ul className="cl-phones">
          {shown.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onPick(p)} title={`Добавить ${fullName(p)} в сравнение`}>
                <PhoneArt phone={p} size="xs" />
                <span>{fullName(p)}</span>
              </button>
            </li>
          ))}
        </ul>}
        {phones.length > FOLD && (
          <button type="button" className="cl-more" aria-expanded={all} onClick={() => setAll(!all)}>
            {all ? 'Свернуть' : `Показать все ${models(phones.length)}`}
          </button>
        )}
      </article>
    </li>
  );
}

/** Changelog на главной: какие смартфоны когда добавлены. Клик по модели ставит её в сравнение. */
export function Changelog({ onPick }: { onPick: (p: Phone) => void }) {
  return (
    <section className="cl" id="cl" aria-labelledby="cl-title">
      <div className="cl-top">
        <p className="eyebrow">Changelog</p>
        <h2 id="cl-title">Что нового на сайте</h2>
        <p className="cl-sub">Что и когда появилось на сайте: новые смартфоны и возможности. Нажмите на модель, чтобы добавить её в сравнение.</p>
      </div>
      <ol className="cl-list">
        {CHANGELOG.map((e, i) => (
          <Entry key={e.version} e={e} latest={i === 0} onPick={onPick} />
        ))}
      </ol>
    </section>
  );
}
