import { useMemo, useState } from 'react';
import type { Phone } from '../../types.ts';
import type { SpecGroup, SpecSection } from '../../lib/specs.ts';
import { shortName } from '../../lib/phones.ts';
import { Card } from '../../components/Card.tsx';
import { Icon } from '../../components/Icon.tsx';
import { ChipLogo } from '../../components/ChipLogo.tsx';

// у чипсета рядом с названием — значок семейства (Snapdragon, MediaTek, Apple…)
const val = (label: string, v?: string) => (v != null && label === 'Чипсет' ? <span className="chip-v"><ChipLogo chip={v} />{v}</span> : (v ?? '—'));

export function SpecRows({ group }: { group: SpecGroup }) {
  return (
    <>
      {group.rows.map((r) => (
        <div className={`spec-row rv${r.same ? ' is-same' : ''}`} key={r.label}>
          <div className="spec-k">{r.label}</div>
          <div className={`spec-v is-a${r.win === 'a' ? ' is-win' : ''}${r.a == null ? ' is-na' : ''}`}>{val(r.label, r.a)}</div>
          <div className={`spec-v is-b${r.win === 'b' ? ' is-win' : ''}${r.b == null ? ' is-na' : ''}`}>{val(r.label, r.b)}</div>
        </div>
      ))}
    </>
  );
}

export function SpecHead({ a, b }: { a: Phone; b: Phone }) {
  return (
    <div className="spec-head">
      <span>Смартфон</span>
      <b className="is-a">{shortName(a)}</b>
      <b className="is-b">{shortName(b)}</b>
    </div>
  );
}

export function SpecTable({ sections, a, b }: { sections: SpecSection[]; a: Phone; b: Phone }) {
  const [diffOnly, setDiffOnly] = useState(false);
  const [q, setQ] = useState('');
  const [closed, setClosed] = useState<Set<string>>(new Set());

  const { shown, diffCount, total } = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let diffCount = 0;
    let total = 0;
    const keep = (r: SpecGroup['rows'][number]) => {
      total += 1;
      if (!r.same) diffCount += 1;
      if (diffOnly && r.same) return false;
      return !ql || [r.label, r.a ?? '', r.b ?? ''].some((s) => s.toLowerCase().includes(ql));
    };
    const shown = sections
      .map((s) => ({ ...s, groups: s.groups.map((g) => ({ ...g, rows: g.rows.filter(keep) })).filter((g) => g.rows.length) }))
      .filter((s) => s.groups.length);
    return { shown, diffCount, total };
  }, [sections, diffOnly, q]);

  const toggle = (t: string) =>
    setClosed((c) => {
      const n = new Set(c);
      n.has(t) ? n.delete(t) : n.add(t);
      return n;
    });

  return (
    <Card id="specs" icon="chip" title="Тесты и характеристики" desc="Победитель в каждой строке подсвечен цветом смартфона">
      <div className="spec-tools">
        <label className="switch">
          <input type="checkbox" checked={diffOnly} onChange={(e) => setDiffOnly(e.target.checked)} />
          <span className="switch-ui" />
          Только отличия
          <small>
            {diffCount} из {total}
          </small>
        </label>
        <div className="spec-search">
          <Icon name="search" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Найти параметр: яркость, зарядка…" aria-label="Поиск по характеристикам" />
          {q && (
            <button type="button" aria-label="Очистить поиск" onClick={() => setQ('')}>
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      </div>

      <SpecHead a={a} b={b} />

      {shown.length === 0 && <p className="empty">Под этот фильтр ничего не нашлось.</p>}
      {shown.map((s) => {
        const isClosed = closed.has(s.title);
        return (
          <div className={`spec-sec${isClosed ? ' is-closed' : ''}`} key={s.title}>
            <button type="button" className="spec-sec-head" onClick={() => toggle(s.title)} aria-expanded={!isClosed}>
              <span className="spec-sec-ico">
                <Icon name={s.icon} size={18} />
              </span>
              <span>
                <b>{s.title}</b>
                <small>{s.desc}</small>
              </span>
              <Icon name="chevron" size={18} className="spec-chev" />
            </button>
            {!isClosed &&
              s.groups.map((g) => (
                <div className="spec-group" key={g.caption}>
                  {g.caption && <div className="spec-cap">{g.caption}</div>}
                  <SpecRows group={g} />
                </div>
              ))}
          </div>
        );
      })}
      <p className="foot">Комплектация, NFC, eSIM и другие параметры могут отличаться в зависимости от региона.</p>
    </Card>
  );
}
