// research/tsv/*.tsv  ->  src/data/phones.json
// Формат строки TSV:  секция|подраздел|параметр|значение A|значение B
//                     B|название замера|значение A|значение B   (бенчмарки и измерения)
// Чтобы добавить телефон: положите ещё одну выгрузку в research/tsv, опишите её в PAGES и запустите `npm run data`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TSV_DIR = path.join(root, 'research', 'tsv');
const OUT = path.join(root, 'src', 'data', 'phones.json');

// Для каждого телефона показывается единый кадр «спина поверх экрана»: public/phones/<id>.webp
// (собирается scripts/combine.mjs из вырезок в research/parts), а если файла нет — нарисованная задняя
// панель: body — градиент корпуса, cam — раскладка камер.
const PAGES = {
  's26u-17pm.tsv': [
    { id: 'samsung-galaxy-s26-ultra', brand: 'Samsung', name: 'Galaxy S26 Ultra', look: { body: ['#9d8cff', '#3b2d9e'], cam: 'col' } },
    { id: 'apple-iphone-17-pro-max', brand: 'Apple', name: 'iPhone 17 Pro Max', look: { body: ['#ffa35c', '#c24a0f'], cam: 'tri' } },
  ],
  '17pro-17.tsv': [
    { id: 'apple-iphone-17-pro', brand: 'Apple', name: 'iPhone 17 Pro', look: { body: ['#3a5fa8', '#0d1a38'], cam: 'tri' } },
    { id: 'apple-iphone-17', brand: 'Apple', name: 'iPhone 17', look: { body: ['#d3def2', '#8fa6cf'], cam: 'duo' } },
  ],
  'poco.tsv': [
    { id: 'xiaomi-poco-f9-ultra', brand: 'Xiaomi', name: 'Poco F9 Ultra', look: { body: ['#34343f', '#0d0d12'], cam: 'plate' } },
    { id: 'xiaomi-poco-f8-ultra', brand: 'Xiaomi', name: 'Poco F8 Ultra', look: { body: ['#f2f5fc', '#9bb4e8'], cam: 'plate' } },
  ],
  'a57-a56.tsv': [
    { id: 'samsung-galaxy-a57-5g', brand: 'Samsung', name: 'Galaxy A57 5G', look: { body: ['#3be0cb', '#0e7c72'], cam: 'col' } },
    { id: 'samsung-galaxy-a56-5g', brand: 'Samsung', name: 'Galaxy A56 5G', look: { body: ['#c2d1b4', '#7c8f6e'], cam: 'col' } },
  ],
  'redmi.tsv': [
    { id: 'xiaomi-redmi-note-17-pro', brand: 'Xiaomi', name: 'Redmi Note 17 Pro', look: { body: ['#ffab57', '#e5561a'], cam: 'plate' } },
    { id: 'xiaomi-redmi-note-15-pro-5g', brand: 'Xiaomi', name: 'Redmi Note 15 Pro 5G', look: { body: ['#8a85f5', '#3f3a9e'], cam: 'plate' } },
  ],
  'oneplus.tsv': [
    { id: 'oneplus-16', brand: 'OnePlus', name: '16', look: { body: ['#ece6d6', '#a89f86'], cam: 'ring' } },
    { id: 'oneplus-15', brand: 'OnePlus', name: '15', look: { body: ['#363636', '#0b0b0b'], cam: 'ring' } },
  ],
  'iphone18-16pm.tsv': [
    { id: 'apple-iphone-18-pro-max', brand: 'Apple', name: 'iPhone 18 Pro Max', look: { body: ['#a8344d', '#3a0b18'], cam: 'tri' } },
    { id: 'apple-iphone-16-pro-max', brand: 'Apple', name: 'iPhone 16 Pro Max', look: { body: ['#dcc7a8', '#8c7355'], cam: 'tri' } },
  ],
  'iphone16-15.tsv': [
    { id: 'apple-iphone-16', brand: 'Apple', name: 'iPhone 16', look: { body: ['#8aa7ff', '#3a55b8'], cam: 'duo' } },
    { id: 'apple-iphone-15', brand: 'Apple', name: 'iPhone 15', look: { body: ['#f4d4d8', '#c79aa0'], cam: 'duo' } },
  ],
  's25u-s25.tsv': [
    { id: 'samsung-galaxy-s25-ultra', brand: 'Samsung', name: 'Galaxy S25 Ultra', look: { body: ['#c1ccdc', '#5d6b82'], cam: 'col' } },
    { id: 'samsung-galaxy-s25', brand: 'Samsung', name: 'Galaxy S25', look: { body: ['#c8e8dd', '#6aa896'], cam: 'col' } },
  ],
  's26fe-s25fe.tsv': [
    { id: 'samsung-galaxy-s26-fe', brand: 'Samsung', name: 'Galaxy S26 FE', look: { body: ['#7b93ff', '#2c3f9e'], cam: 'col' } },
    { id: 'samsung-galaxy-s25-fe', brand: 'Samsung', name: 'Galaxy S25 FE', look: { body: ['#a9cbea', '#4f7fb0'], cam: 'col' } },
  ],
  'pixel10.tsv': [
    { id: 'google-pixel-10-pro-xl', brand: 'Google', name: 'Pixel 10 Pro XL', look: { body: ['#4a5260', '#14171d'], cam: 'bar' } },
    { id: 'google-pixel-10', brand: 'Google', name: 'Pixel 10', look: { body: ['#ece47f', '#b5ab3a'], cam: 'bar' } },
  ],
  // на этой странице источник сам поставил 17T Pro в первую колонку
  'xiaomi17.tsv': [
    { id: 'xiaomi-17t-pro', brand: 'Xiaomi', name: '17T Pro', look: { body: ['#6a5fe0', '#251f6b'], cam: 'plate' } },
    { id: 'xiaomi-17-pro-max', brand: 'Xiaomi', name: '17 Pro Max', look: { body: ['#f2f4f1', '#9fb3a8'], cam: 'plate' } },
  ],
  'poco-x8.tsv': [
    { id: 'xiaomi-poco-x8-pro-max', brand: 'Xiaomi', name: 'Poco X8 Pro Max', look: { body: ['#4f86f5', '#1b3a8f'], cam: 'plate' } },
    { id: 'xiaomi-poco-f8-pro', brand: 'Xiaomi', name: 'Poco F8 Pro', look: { body: ['#d6dce8', '#7f8ca6'], cam: 'plate' } },
  ],
  'vivo-oppo.tsv': [
    { id: 'vivo-x300-ultra', brand: 'Vivo', name: 'X300 Ultra', look: { body: ['#d3ecdc', '#6fa88a'], cam: 'ring' } },
    { id: 'oppo-find-x9-ultra', brand: 'Oppo', name: 'Find X9 Ultra', look: { body: ['#f59a4c', '#9a3c08'], cam: 'ring' } },
  ],
};

const MONTHS = { Январь: 1, Февраль: 2, Март: 3, Апрель: 4, Май: 5, Июнь: 6, Июль: 7, Август: 8, Сентябрь: 9, Октябрь: 10, Ноябрь: 11, Декабрь: 12 };
const EMPTY = new Set(['-', 'н/д', '']);

const num = (s) => {
  const m = String(s).replace(',', '.').match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
};

function released(text) {
  const m = text?.match(/([А-Яа-я]+)\s+(\d{4})/);
  return m && MONTHS[m[1]] ? `${m[2]}-${String(MONTHS[m[1]]).padStart(2, '0')}` : '';
}

function parse(text) {
  const rows = [[], []];
  const bench = [{}, {}];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const p = line.split('|');
    if (p[0] === 'H') continue;
    if (p[0] === 'B') {
      const [, title, a, b] = p;
      [a, b].forEach((v, i) => !EMPTY.has(v) && (bench[i][title] = v));
      continue;
    }
    const [sec, sub, rawLabel, a, b] = p;
    const label = rawLabel.replace(/\*$/, '');
    [a, b].forEach((v, i) => !EMPTY.has(v) && rows[i].push([sec, sub, label, v]));
  }
  return { rows, bench };
}

const PHOTO_DIR = path.join(root, 'public', 'phones');

// Отношение ширины к высоте вырезки (0 — файла нет). Страница резервирует под снимок место заранее,
// поэтому текст рядом с миниатюрой не прыгает, когда картинка догружается.
async function photoRatio(id) {
  const file = path.join(PHOTO_DIR, `${id}.webp`);
  if (!fs.existsSync(file)) return 0;
  const { width, height } = await sharp(file).metadata();
  return +(width / height).toFixed(4);
}

const phones = [];
for (const [file, pair] of Object.entries(PAGES)) {
  const { rows, bench } = parse(fs.readFileSync(path.join(TSV_DIR, file), 'utf8'));
  for (const [i, meta] of pair.entries()) {
    const get = (label) => rows[i].find((r) => r[2] === label)?.[3] ?? '';
    phones.push({
      ...meta,
      photo: await photoRatio(meta.id),
      tier: get('Класс') || 'Флагман',
      released: released(get('Дата выхода')),
      price: num(get('Цена на момент выхода')) ?? 0,
      rows: rows[i],
      bench: bench[i],
    });
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(phones));
const withPhoto = phones.filter((p) => p.photo).length;
console.log(`phones.json: ${phones.length} телефонов, ${(fs.statSync(OUT).size / 1024).toFixed(1)} КБ, кадров «спина + экран»: ${withPhoto}`);
for (const p of phones) {
  const ph = p.photo ? `кадр ${p.photo.toFixed(2)}` : 'нет кадра';
  console.log(`  ${p.id.padEnd(30)} ${ph.padEnd(10)} ${p.released}  $${p.price}  rows=${p.rows.length} bench=${Object.keys(p.bench).length}`);
}
