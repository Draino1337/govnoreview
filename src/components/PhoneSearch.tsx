import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { Phone } from '../types.ts';
import { PHONES, fullName, models, searchPhones } from '../lib/phones.ts';
import { analyze } from '../lib/analysis.ts';
import { overall } from '../lib/score.ts';
import { PhoneArt } from './PhoneArt.tsx';
import { Icon } from './Icon.tsx';

interface Props {
  label: string;
  accent: 'a' | 'b';
  value: Phone | null;
  exclude?: string;
  autoFocus?: boolean;
  onChange: (p: Phone | null) => void;
  /** поле потеряло фокус (закрыли без выбора) */
  onDismiss?: () => void;
}

// бренды для быстрых фильтров: чем больше моделей в каталоге, тем левее
const BRANDS = [...PHONES.reduce((m, p) => m.set(p.brand, (m.get(p.brand) ?? 0) + 1), new Map<string, number>())].sort((x, y) => y[1] - x[1]);

function Mark({ text, q }: { text: string; q: string }) {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return <>{text}</>;
  const re = new RegExp(`(${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig');
  return (
    <>
      {text.split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))}
    </>
  );
}

export function PhoneSearch({ label, accent, value, exclude, autoFocus, onChange, onDismiss }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const [maxH, setMaxH] = useState(460);
  const [up, setUp] = useState(false);

  // панель не вылезает за край окна: если снизу тесно, а сверху (под шапкой) просторнее — открывается вверх
  const fit = () => {
    const r = input.current?.parentElement?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 24;
    const above = r.top - (document.querySelector('.hdr')?.getBoundingClientRect().bottom ?? 0) - 16;
    const flip = below < 340 && above > below;
    setUp(flip);
    setMaxH(Math.max(240, Math.min(460, flip ? above : below)));
  };

  // пока открыта — пересчитываем при прокрутке и смене размера окна (экранная клавиатура, плавная прокрутка)
  useEffect(() => {
    if (!editing) return;
    window.addEventListener('scroll', fit, { passive: true });
    window.addEventListener('resize', fit);
    return () => {
      window.removeEventListener('scroll', fit);
      window.removeEventListener('resize', fit);
    };
  }, [editing]);

  // весь каталог по алфавиту, список прокручивается
  const list = useMemo(() => searchPhones(editing ? q : '').filter((p) => p.id !== exclude), [q, editing, exclude]);
  const open = editing;
  // чипы брендов — пока запрос пустой или это сам бренд из чипа
  const brandQ = BRANDS.some(([b]) => b === q) ? q : '';
  const chips = open && (!q.trim() || brandQ);

  // при выборе стрелками подсвеченная строка не должна уезжать за край прокрутки
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    listRef.current?.querySelector('.is-hi')?.scrollIntoView({ block: 'nearest' });
  }, [hi]);

  const pick = (p: Phone) => {
    onChange(p);
    setEditing(false);
    setQ('');
    input.current?.blur();
  };
  const query = (s: string) => {
    setQ(s);
    setHi(0);
    listRef.current?.scrollTo(0, 0);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHi((h) => Math.min(list.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter' && list[hi]) {
      e.preventDefault();
      pick(list[hi]);
    } else if (e.key === 'Escape') {
      setEditing(false);
      input.current?.blur();
    }
  };

  return (
    <div className={`ps ps-${accent}${open ? ' is-open' : ''}`}>
      <label className="ps-label" htmlFor={id}>
        <i className="ps-dot" />
        {label}
      </label>
      <div className="ps-field">
        <span className="ps-lead">{value && !editing ? <PhoneArt phone={value} size="xs" /> : <Icon name="search" size={18} />}</span>
        <input
          id={id}
          ref={input}
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-activedescendant={open && list[hi] ? `${id}-o${hi}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          placeholder="iPhone, Galaxy, Poco…"
          value={editing ? q : value ? fullName(value) : ''}
          onFocus={() => {
            setEditing(true);
            setQ('');
            setHi(0);
            fit();
          }}
          onBlur={() => {
            setEditing(false);
            onDismiss?.();
          }}
          onChange={(e) => query(e.target.value)}
          onKeyDown={onKey}
        />
        {value && (
          <button type="button" className="ps-clear" aria-label="Очистить" onMouseDown={(e) => e.preventDefault()} onClick={() => onChange(null)}>
            <Icon name="close" size={16} />
          </button>
        )}
      </div>
      {open && (
        // mousedown внутри панели не уводит фокус из поля — иначе она закроется раньше клика
        <div className={`ps-pop${up ? ' is-up' : ''}`} style={{ maxHeight: maxH }} onMouseDown={(e) => e.preventDefault()}>
          {chips && (
            <div className="ps-brands" role="group" aria-label="Бренды">
              {BRANDS.map(([b, n]) => (
                <button key={b} type="button" tabIndex={-1} className={b === brandQ ? 'is-on' : undefined} aria-pressed={b === brandQ} onClick={() => query(b === brandQ ? '' : b)}>
                  {b}
                  <small>{n}</small>
                </button>
              ))}
            </div>
          )}
          <ul ref={listRef} className="ps-list" role="listbox" id={`${id}-list`} aria-label={label}>
            {list.length === 0 && (
              <li className="ps-empty">
                <Icon name="search" size={22} />
                Ничего не нашли. Попробуйте короче: «s25», «пиксель», «поко».
              </li>
            )}
            {list.map((p, i) => {
              const score = overall(analyze(p).s);
              return (
                <li key={p.id} id={`${id}-o${i}`} role="option" aria-selected={i === hi} className={`${i === hi ? 'is-hi' : ''}${p.id === value?.id ? ' is-cur' : ''}`} onMouseEnter={() => setHi(i)} onClick={() => pick(p)}>
                  <span className="ps-art">
                    <PhoneArt phone={p} size="xs" />
                  </span>
                  <span className="ps-name">
                    <b>
                      <Mark text={fullName(p)} q={q} />
                    </b>
                    <small>
                      {p.tier} · {p.released.slice(0, 4)}
                      {p.id === value?.id && <em> · выбран</em>}
                    </small>
                  </span>
                  {p.price > 0 && <span className="ps-price">${p.price}</span>}
                  <span className="ps-score" style={{ '--v': score } as CSSProperties} title="Итоговая оценка из 100">
                    {score}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="ps-foot">
            <span>{q.trim() ? `Найдено: ${models(list.length)}` : `Весь каталог: ${models(list.length)}`}</span>
            <span className="ps-keys" aria-hidden="true">
              <kbd>↑</kbd>
              <kbd>↓</kbd> <kbd>Enter</kbd> выбрать <kbd>Esc</kbd>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
