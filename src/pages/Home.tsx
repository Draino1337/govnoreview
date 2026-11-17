import { useMemo, useState } from 'react';
import type { Phone } from '../types.ts';
import { analyze } from '../lib/analysis.ts';
import { useVisible } from '../lib/hooks.ts';
import { PHONES, byId, chipset, fullName, pairPath, searchPhones, shortName } from '../lib/phones.ts';
import { overall } from '../lib/score.ts';
import { go, hrefOf } from '../router.ts';
import { Icon } from '../components/Icon.tsx';
import { PhoneArt } from '../components/PhoneArt.tsx';
import { PhoneSearch } from '../components/PhoneSearch.tsx';
import { Ring } from '../components/Ring.tsx';

const POPULAR: [string, string][] = [
  ['samsung-galaxy-s26-ultra', 'apple-iphone-17-pro-max'],
  ['xiaomi-poco-f9-ultra', 'xiaomi-poco-f8-ultra'],
  ['oneplus-16', 'oneplus-15'],
  ['apple-iphone-17-pro', 'apple-iphone-17'],
  ['samsung-galaxy-a57-5g', 'samsung-galaxy-a56-5g'],
  ['xiaomi-redmi-note-17-pro', 'xiaomi-redmi-note-15-pro-5g'],
  ['samsung-galaxy-s26-ultra', 'oneplus-16'],
  ['apple-iphone-17-pro-max', 'xiaomi-poco-f9-ultra'],
  ['samsung-galaxy-a57-5g', 'xiaomi-redmi-note-17-pro'],
];

function PairCard({ a, b }: { a: Phone; b: Phone }) {
  const A = analyze(a);
  const B = analyze(b);
  const sa = overall(A.s, 'all');
  const sb = overall(B.s, 'all');
  return (
    <a className="pair" href={hrefOf(pairPath(a.id, b.id))}>
      <div className="pair-art">
        <PhoneArt phone={a} lenses={A.m.lenses} size="sm" />
        <span>VS</span>
        <PhoneArt phone={b} lenses={B.m.lenses} size="sm" />
      </div>
      <div className="pair-names">
        <b className="is-a">{shortName(a)}</b>
        <b className="is-b">{shortName(b)}</b>
      </div>
      <div className="pair-split" aria-hidden="true">
        <i style={{ width: `${(sa / (sa + sb)) * 100}%` }} />
        <i style={{ width: `${(sb / (sa + sb)) * 100}%` }} />
      </div>
      <div className="pair-scores">
        <span className="is-a">{sa}</span>
        <span className="is-b">{sb}</span>
      </div>
    </a>
  );
}

type Sort = 'score' | 'new' | 'cheap';
const SORTS: [Sort, string][] = [
  ['score', 'По оценке'],
  ['new', 'Сначала новые'],
  ['cheap', 'Сначала дешёвые'],
];
const BRANDS = ['Все', ...Array.from(new Set(PHONES.map((p) => p.brand)))];

function PhoneCard({ p, slot, onToggle }: { p: Phone; slot: 'a' | 'b' | null; onToggle: () => void }) {
  const { m, s } = analyze(p);
  const score = overall(s, 'all');
  return (
    <article className={`pc${slot ? ` is-picked is-${slot}` : ''}`}>
      <div className="pc-art">
        <PhoneArt phone={p} lenses={m.lenses} size="md" />
        <div className="pc-score">
          <Ring value={score} color={score >= 80 ? 'var(--good)' : score >= 60 ? 'var(--a)' : 'var(--b)'} size={52} caption="" />
        </div>
      </div>
      <h3>{shortName(p)}</h3>
      <p className="pc-meta">
        {p.brand} · {p.tier} · {p.released.slice(0, 4)} · ${p.price}
      </p>
      <ul className="pc-specs">
        <li>
          <Icon name="chip" size={16} />
          <span>{chipset(p)}</span>
        </li>
        <li>
          <Icon name="display" size={16} />
          <span>
            {m.diag}″ · {m.hz} Гц
          </span>
        </li>
        <li>
          <Icon name="battery" size={16} />
          <span>{m.bat} мАч</span>
        </li>
        <li>
          <Icon name="camera" size={16} />
          <span>{m.mp} Мп{m.hasTele ? ` · зум ${m.zoom || '—'}x` : ''}</span>
        </li>
      </ul>
      <button type="button" className={`btn ${slot ? 'btn-picked' : 'btn-ghost'} btn-sm`} onClick={onToggle} aria-pressed={!!slot}>
        {slot ? (
          <>
            <Icon name="check" size={15} />
            Выбран · {slot === 'a' ? '1-й' : '2-й'}
          </>
        ) : (
          <>
            <Icon name="plus" size={15} />
            Сравнить
          </>
        )}
      </button>
    </article>
  );
}

export function Home() {
  // оба слота в одном состоянии — быстрые клики подряд не затирают друг друга
  const [[a, b], setSlots] = useState<[Phone | null, Phone | null]>([null, null]);
  const setA = (p: Phone | null) => setSlots(([, y]) => [p, y]);
  const setB = (p: Phone | null) => setSlots(([x]) => [x, p]);
  const [brand, setBrand] = useState('Все');
  const [sort, setSort] = useState<Sort>('score');
  const [q, setQ] = useState('');
  const [boxRef, boxVisible] = useVisible<HTMLDivElement>();

  const ready = !!a && !!b && a.id !== b.id;
  const submit = () => ready && go(pairPath(a!.id, b!.id));

  const random = () => {
    const i = Math.floor(Math.random() * PHONES.length);
    let j = Math.floor(Math.random() * (PHONES.length - 1));
    if (j >= i) j += 1;
    go(pairPath(PHONES[i].id, PHONES[j].id));
  };

  const toggle = (p: Phone) =>
    setSlots(([x, y]) => {
      if (x?.id === p.id) return [null, y];
      if (y?.id === p.id) return [x, null];
      if (!x) return [p, y];
      if (!y) return [x, p];
      return [y, p]; // оба заняты: первый вытесняется
    });

  const list = useMemo(() => {
    const hits = q.trim() ? new Set(searchPhones(q, 99).map((p) => p.id)) : null;
    const score = (p: Phone) => overall(analyze(p).s, 'all');
    return PHONES.filter((p) => (brand === 'Все' || p.brand === brand) && (!hits || hits.has(p.id))).sort((x, y) =>
      sort === 'score' ? score(y) - score(x) : sort === 'new' ? y.released.localeCompare(x.released) : x.price - y.price,
    );
  }, [brand, sort, q]);

  return (
    <div className="wrap home">
      <section className="home-hero">
        <p className="eyebrow">
          <Icon name="scale" size={15} />
          Сравнение смартфонов
        </p>
        <h1>
          Два телефона. Один честный <em>победитель</em>.
        </h1>
        <p className="lead">Характеристики, замеры, автономность и камеры бок о бок. Меняйте сценарий — игры, фото, батарея — и смотрите, как меняется лидер.</p>

        <div className="card picker" ref={boxRef}>
          <PhoneSearch label="Первый смартфон" accent="a" value={a} exclude={b?.id} onChange={setA} />
          <div className="picker-vs">VS</div>
          <PhoneSearch label="Второй смартфон" accent="b" value={b} exclude={a?.id} onChange={setB} />
          <div className="picker-actions">
            <button type="button" className="btn btn-primary" disabled={!ready} onClick={submit}>
              Сравнить
              <Icon name="arrow" size={18} />
            </button>
            <button type="button" className="btn btn-ghost" onClick={random}>
              <Icon name="dice" size={18} />
              Случайная пара
            </button>
          </div>
        </div>
      </section>

      <div className="section-h">
        <h2>Популярные сравнения</h2>
        <p>Готовые пары — один клик</p>
      </div>
      <div className="pairs">
        {POPULAR.map(([x, y]) => (
          <PairCard key={x + y} a={byId.get(x)!} b={byId.get(y)!} />
        ))}
      </div>

      <div className="section-h" id="catalog">
        <h2>Каталог</h2>
        <p>{PHONES.length} моделей. Отметьте любые два и сравните</p>
      </div>
      <div className="cat-tools">
        <div className="spec-search cat-search">
          <Icon name="search" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Найти модель" aria-label="Найти модель в каталоге" />
        </div>
        <div className="cat-chips" role="group" aria-label="Бренд">
          {BRANDS.map((x) => (
            <button key={x} type="button" className={`chip${brand === x ? ' is-on' : ''}`} onClick={() => setBrand(x)}>
              {x}
            </button>
          ))}
        </div>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Сортировка">
          {SORTS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="cat-grid">
        {list.map((p) => (
          <PhoneCard key={p.id} p={p} slot={a?.id === p.id ? 'a' : b?.id === p.id ? 'b' : null} onToggle={() => toggle(p)} />
        ))}
        {list.length === 0 && <p className="empty">Ничего не нашли — попробуйте другое название.</p>}
      </div>

      <div className={`tray${(a || b) && !boxVisible ? ' is-on' : ''}`} aria-hidden={!((a || b) && !boxVisible)}>
        <span className={`tray-slot is-a${a ? '' : ' is-empty'}`}>{a ? fullName(a) : 'Выберите первый'}</span>
        <span className="tray-vs">VS</span>
        <span className={`tray-slot is-b${b ? '' : ' is-empty'}`}>{b ? fullName(b) : 'Выберите второй'}</span>
        <button type="button" className="btn btn-primary btn-sm" disabled={!ready} onClick={submit}>
          Сравнить
        </button>
      </div>
    </div>
  );
}
