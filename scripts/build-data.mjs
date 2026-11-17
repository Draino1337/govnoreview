// research/tsv/*.tsv  ->  src/data/phones.json
// Формат строки TSV:  секция|подраздел|параметр|значение A|значение B
//                     B|название замера|значение A|значение B   (бенчмарки и измерения)
// Чтобы добавить телефон: положите ещё одну выгрузку в research/tsv, опишите её в PAGES и запустите `npm run data`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TSV_DIR = path.join(root, 'research', 'tsv');
const OUT = path.join(root, 'src', 'data', 'phones.json');

// body — градиент корпуса, wall — обои на экране, cam — раскладка камер на задней панели
const PAGES = {
  's26u-17pm.tsv': [
    { id: 'samsung-galaxy-s26-ultra', brand: 'Samsung', name: 'Galaxy S26 Ultra', look: { body: ['#9d8cff', '#3b2d9e'], wall: ['#c3b5ff', '#4a2fd0'], cam: 'col' } },
    { id: 'apple-iphone-17-pro-max', brand: 'Apple', name: 'iPhone 17 Pro Max', look: { body: ['#ffa35c', '#c24a0f'], wall: ['#14224a', '#ff7a2f'], cam: 'tri' } },
  ],
  '17pro-17.tsv': [
    { id: 'apple-iphone-17-pro', brand: 'Apple', name: 'iPhone 17 Pro', look: { body: ['#3a5fa8', '#0d1a38'], wall: ['#0d1a38', '#4b7be0'], cam: 'tri' } },
    { id: 'apple-iphone-17', brand: 'Apple', name: 'iPhone 17', look: { body: ['#d3def2', '#8fa6cf'], wall: ['#a8c0f0', '#eadcff'], cam: 'duo' } },
  ],
  'poco.tsv': [
    { id: 'xiaomi-poco-f9-ultra', brand: 'Xiaomi', name: 'Poco F9 Ultra', look: { body: ['#34343f', '#0d0d12'], wall: ['#ff3355', '#2a0a14'], cam: 'plate' } },
    { id: 'xiaomi-poco-f8-ultra', brand: 'Xiaomi', name: 'Poco F8 Ultra', look: { body: ['#f2f5fc', '#9bb4e8'], wall: ['#7aa2ff', '#1c2d6b'], cam: 'plate' } },
  ],
  'a57-a56.tsv': [
    { id: 'samsung-galaxy-a57-5g', brand: 'Samsung', name: 'Galaxy A57 5G', look: { body: ['#3be0cb', '#0e7c72'], wall: ['#7ff0e0', '#134e4a'], cam: 'col' } },
    { id: 'samsung-galaxy-a56-5g', brand: 'Samsung', name: 'Galaxy A56 5G', look: { body: ['#c2d1b4', '#7c8f6e'], wall: ['#d9e8cb', '#4b5d3f'], cam: 'col' } },
  ],
  'redmi.tsv': [
    { id: 'xiaomi-redmi-note-17-pro', brand: 'Xiaomi', name: 'Redmi Note 17 Pro', look: { body: ['#ffab57', '#e5561a'], wall: ['#ffc07e', '#7a2a0a'], cam: 'plate' } },
    { id: 'xiaomi-redmi-note-15-pro-5g', brand: 'Xiaomi', name: 'Redmi Note 15 Pro 5G', look: { body: ['#8a85f5', '#3f3a9e'], wall: ['#b1abff', '#2d2a7a'], cam: 'plate' } },
  ],
  'oneplus.tsv': [
    { id: 'oneplus-16', brand: 'OnePlus', name: '16', look: { body: ['#ece6d6', '#a89f86'], wall: ['#f5ebcd', '#6b5a2e'], cam: 'ring' } },
    { id: 'oneplus-15', brand: 'OnePlus', name: '15', look: { body: ['#363636', '#0b0b0b'], wall: ['#e0b03f', '#1a1408'], cam: 'ring' } },
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

const phones = [];
for (const [file, pair] of Object.entries(PAGES)) {
  const { rows, bench } = parse(fs.readFileSync(path.join(TSV_DIR, file), 'utf8'));
  pair.forEach((meta, i) => {
    const get = (label) => rows[i].find((r) => r[2] === label)?.[3] ?? '';
    phones.push({
      ...meta,
      tier: get('Класс') || 'Флагман',
      released: released(get('Дата выхода')),
      price: num(get('Цена на момент выхода')) ?? 0,
      rows: rows[i],
      bench: bench[i],
    });
  });
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(phones));
console.log(`phones.json: ${phones.length} телефонов, ${(fs.statSync(OUT).size / 1024).toFixed(1)} КБ`);
for (const p of phones) console.log(`  ${p.id.padEnd(30)} ${p.released}  $${p.price}  rows=${p.rows.length} bench=${Object.keys(p.bench).length}`);
