import raw from '../data/phones.json';
import type { Phone } from '../types.ts';

export const PHONES = raw as unknown as Phone[];
export const byId = new Map(PHONES.map((p) => [p.id, p]));

export const fullName = (p: Phone) => (p.name.startsWith(p.brand) ? p.name : `${p.brand} ${p.name}`);
// у этих брендов название модели без бренда непонятно («16», «X300 Ultra», «17T Pro»)
const BRAND_IN_SHORT = new Set(['OnePlus', 'Vivo', 'Oppo']);
export const shortName = (p: Phone) => (BRAND_IN_SHORT.has(p.brand) || /^\d/.test(p.name) ? `${p.brand} ${p.name}` : p.name);

// чтобы находилось и по-русски: «айфон», «самсунг», «поко»…
const ALIASES: Record<string, string> = {
  Apple: 'эппл айфон iphone',
  Samsung: 'самсунг галакси galaxy',
  Xiaomi: 'сяоми ксиаоми ксиоми редми поко redmi poco mi',
  OnePlus: 'ванплас ван плас oneplus',
  Google: 'гугл пиксель google pixel',
  Vivo: 'виво vivo',
  Oppo: 'оппо oppo',
};
const hay = (p: Phone) => `${fullName(p)} ${ALIASES[p.brand] ?? ''}`.toLowerCase();

export function searchPhones(q: string, limit = 8): Phone[] {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  return PHONES.filter((p) => {
    const h = hay(p);
    return tokens.every((t) => h.includes(t));
  })
    .sort((a, b) => b.released.localeCompare(a.released))
    .slice(0, limit);
}

export const pairPath = (a: string, b: string) => `/compare/${a}-vs-${b}`;

export function parsePair(slug: string): [Phone, Phone] | null {
  const i = slug.indexOf('-vs-');
  if (i < 0) return null;
  const a = byId.get(slug.slice(0, i));
  const b = byId.get(slug.slice(i + 4));
  return a && b && a !== b ? [a, b] : null;
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const monthYear = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return m ? `${MONTHS[m - 1]} ${y}` : String(y);
};
export const monthsApart = (a: string, b: string) => {
  const [ya, ma] = a.split('-').map(Number);
  const [yb, mb] = b.split('-').map(Number);
  return (yb - ya) * 12 + (mb - ma);
};

export const chipset = (p: Phone) => p.rows.find((r) => r[2] === 'Чипсет')?.[3] ?? '—';
