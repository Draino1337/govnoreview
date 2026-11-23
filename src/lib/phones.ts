import raw from '../data/phones.json';
import type { Phone } from '../types.ts';

export const PHONES = raw as unknown as Phone[];
export const byId = new Map(PHONES.map((p) => [p.id, p]));

export const fullName = (p: Phone) => (p.name.startsWith(p.brand) ? p.name : `${p.brand} ${p.name}`);
// у этих брендов название модели без бренда непонятно («16», «X300 Ultra», «17T Pro»)
const BRAND_IN_SHORT = new Set(['OnePlus', 'Vivo', 'Oppo', 'Huawei', 'Honor', 'Realme', 'Nothing']);
export const shortName = (p: Phone) => (BRAND_IN_SHORT.has(p.brand) || /^\d/.test(p.name) ? `${p.brand} ${p.name}` : p.name);

// чтобы находилось и по-русски: «айфон», «самсунг», «поко»…
const ALIASES: Record<string, string> = {
  Apple: 'эппл айфон iphone',
  Samsung: 'самсунг галакси galaxy',
  Xiaomi: 'сяоми ксиаоми ксиоми mi',
  OnePlus: 'ванплас ван плас oneplus',
  Google: 'гугл пиксель google pixel',
  Vivo: 'виво vivo',
  Oppo: 'оппо oppo',
  Huawei: 'хуавей хуавэй huawei',
  Honor: 'хонор honor',
  Realme: 'реалми риалми realme',
  Sony: 'сони иксперия xperia',
  Asus: 'асус рог rog',
  ZTE: 'зте нубия ред мэджик red magic nubia',
  Motorola: 'моторола разр motorola',
  Nothing: 'насинг нотинг nothing',
};
const hay = (p: Phone) => `${fullName(p)} ${ALIASES[p.brand] ?? ''}`.toLowerCase();

// по алфавиту, числа — как числа: iPhone 15, 16, 17 (а не 15, 17, 16 Pro…)
const byName = (a: Phone, b: Phone) => fullName(a).localeCompare(fullName(b), 'en', { numeric: true, sensitivity: 'base' });

// слова из названий моделей, набранные по-русски: «айфон 15 про», «поко ф8»
const WORDS: Record<string, string> = {
  про: 'pro', ультра: 'ultra', макс: 'max', плюс: 'plus', лайт: 'lite', мини: 'mini', фолд: 'fold', флип: 'flip', поко: 'poco', редми: 'redmi', пура: 'pura',
};
// номер модели с русскими буквами («с25», «ф8», «3а», «х300») — латиницей по звучанию
const LAT: Record<string, string> = { а: 'a', в: 'v', е: 'e', з: 'z', и: 'i', к: 'k', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x' };
const queryTokens = (q: string) =>
  q
    .toLowerCase()
    .replace(/([a-zа-яё]{3,})(\d)/g, '$1 $2') // «iphone15» → «iphone 15»
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => WORDS[t] ?? (/\d/.test(t) ? t.replace(/[а-яё]/g, (c) => LAT[c] ?? c) : t));

/** Телефоны, подходящие под запрос (пустой запрос — весь каталог), по алфавиту. */
export function searchPhones(q: string, limit = Infinity): Phone[] {
  const tokens = queryTokens(q);
  return PHONES.filter((p) => {
    const h = hay(p);
    return tokens.every((t) => h.includes(t));
  })
    .sort(byName)
    .slice(0, limit);
}

// самопроверка поиска при разработке: русские запросы должны находить модели
if (import.meta.env.DEV) {
  for (const q of ['айфон 15 про', 'самсунг с25 ультра', 'поко ф8', 'iphone15', 'пиксель 9 про', 'хуавей пура 70 ультра'])
    console.assert(searchPhones(q).length > 0, `поиск «${q}» ничего не нашёл`);
  console.assert(searchPhones('поко').every((p) => /poco/i.test(p.name)), 'поиск «поко» находит не только Poco');
}

export const pairPath =(a: string, b: string) => `/compare/${a}-vs-${b}`;

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

/** «1 модель», «3 модели», «163 модели», «142 модели», «11 моделей» */
export const models = (n: number) => {
  const k = n % 100 > 10 && n % 100 < 20 ? 2 : [2, 0, 1, 1, 1, 2][Math.min(n % 10, 5)];
  return `${n} ${['модель', 'модели', 'моделей'][k]}`;
};
