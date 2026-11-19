import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Phone } from '../types.ts';
import { fullName, models, searchPhones } from '../lib/phones.ts';
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
  const [maxH, setMaxH] = useState(390);

  // список не должен вылезать за нижний край окна (на главной страница не прокручивается)
  const fit = () => {
    const r = input.current?.parentElement?.getBoundingClientRect();
    if (r) setMaxH(Math.max(170, Math.min(390, window.innerHeight - r.bottom - 24)));
  };

  // весь каталог по алфавиту, список прокручивается
  const list = useMemo(() => searchPhones(editing ? q : '').filter((p) => p.id !== exclude), [q, editing, exclude]);
  const open = editing;

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
          placeholder="Название модели: iPhone, Galaxy, Poco…"
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
          onChange={(e) => {
            setQ(e.target.value);
            setHi(0);
          }}
          onKeyDown={onKey}
        />
        {value && (
          <button type="button" className="ps-clear" aria-label="Очистить" onMouseDown={(e) => e.preventDefault()} onClick={() => onChange(null)}>
            <Icon name="close" size={16} />
          </button>
        )}
      </div>
      {open && (
        <ul ref={listRef} className="ps-list" role="listbox" id={`${id}-list`} style={{ maxHeight: maxH }}>
          {list.length === 0 && <li className="ps-empty">Ничего не нашли. В каталоге пока {models(searchPhones('').length)}.</li>}
          {list.map((p, i) => (
            <li key={p.id} id={`${id}-o${i}`} role="option" aria-selected={i === hi} className={i === hi ? 'is-hi' : ''} onMouseEnter={() => setHi(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(p)}>
              <PhoneArt phone={p} size="xs" />
              <span className="ps-name">
                <b>
                  <Mark text={fullName(p)} q={q} />
                </b>
                <small>
                  {p.tier} · {p.released.slice(0, 4)} · ${p.price}
                </small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
