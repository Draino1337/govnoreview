// research/tsv/*.tsv  ->  src/data/phones.json
// Формат строки TSV:  секция|подраздел|параметр|значение A|значение B
//                     B|название замера|значение A|значение B   (бенчмарки и измерения)
// Чтобы добавить телефон: положите ещё одну выгрузку в research/tsv, опишите её в PAGES и запустите `npm run data`.
// Новые модели добавьте записью в src/data/changelog.ts — это Changelog на главной.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TSV_DIR = path.join(root, 'research', 'tsv');
const OUT = path.join(root, 'src', 'data', 'phones.json');

// Для каждого телефона показывается единый кадр «экран поверх спины»: public/phones/<id>.webp
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
  // все остальные Google Pixel: NanoReview, а Pixel, Pixel XL, Pixel 2, 2 XL и 3a XL — с GSMArena (на NanoReview их нет)
  'pixel1.tsv': [
    { id: 'google-pixel-xl', brand: 'Google', name: 'Pixel XL', look: { body: ['#3a3d42', '#16181b'], cam: 'col' } },
    { id: 'google-pixel', brand: 'Google', name: 'Pixel', look: { body: ['#e9ebee', '#b9bdc4'], cam: 'col' } },
  ],
  'pixel2.tsv': [
    { id: 'google-pixel-2-xl', brand: 'Google', name: 'Pixel 2 XL', look: { body: ['#f2f2f0', '#c9c9c6'], cam: 'col' } },
    { id: 'google-pixel-2', brand: 'Google', name: 'Pixel 2', look: { body: ['#9fb6cf', '#5f7891'], cam: 'col' } },
  ],
  'pixel3.tsv': [
    { id: 'google-pixel-3-xl', brand: 'Google', name: 'Pixel 3 XL', look: { body: ['#f4f4f2', '#cfcfcc'], cam: 'col' } },
    { id: 'google-pixel-3', brand: 'Google', name: 'Pixel 3', look: { body: ['#f3dcd3', '#d1b3a8'], cam: 'col' } },
  ],
  'pixel3a.tsv': [
    { id: 'google-pixel-3a-xl', brand: 'Google', name: 'Pixel 3a XL', look: { body: ['#38393c', '#141517'], cam: 'col' } },
    { id: 'google-pixel-3a', brand: 'Google', name: 'Pixel 3a', look: { body: ['#d9d3e6', '#ada3c2'], cam: 'col' } },
  ],
  'pixel4.tsv': [
    { id: 'google-pixel-4-xl', brand: 'Google', name: 'Pixel 4 XL', look: { body: ['#f2f2f0', '#cbcbc8'], cam: 'plate' } },
    { id: 'google-pixel-4', brand: 'Google', name: 'Pixel 4', look: { body: ['#f2a374', '#d1774a'], cam: 'plate' } },
  ],
  'pixel4a.tsv': [
    { id: 'google-pixel-4a-5g', brand: 'Google', name: 'Pixel 4a 5G', look: { body: ['#3b3c3f', '#151618'], cam: 'plate' } },
    { id: 'google-pixel-4a', brand: 'Google', name: 'Pixel 4a', look: { body: ['#2f3033', '#111214'], cam: 'plate' } },
  ],
  'pixel5.tsv': [
    { id: 'google-pixel-5', brand: 'Google', name: 'Pixel 5', look: { body: ['#b8c4b0', '#87957f'], cam: 'plate' } },
  ],
  'pixel6.tsv': [
    { id: 'google-pixel-6-pro', brand: 'Google', name: 'Pixel 6 Pro', look: { body: ['#f5e9c8', '#d6c393'], cam: 'bar' } },
    { id: 'google-pixel-6', brand: 'Google', name: 'Pixel 6', look: { body: ['#f2b8a6', '#d58c78'], cam: 'bar' } },
  ],
  'pixel7.tsv': [
    { id: 'google-pixel-7-pro', brand: 'Google', name: 'Pixel 7 Pro', look: { body: ['#c7c3b3', '#8f8b7b'], cam: 'bar' } },
    { id: 'google-pixel-7', brand: 'Google', name: 'Pixel 7', look: { body: ['#e6e9c6', '#bcc28f'], cam: 'bar' } },
  ],
  'pixel7a-6a.tsv': [
    { id: 'google-pixel-7a', brand: 'Google', name: 'Pixel 7a', look: { body: ['#b9cfe3', '#7f9cb8'], cam: 'bar' } },
    { id: 'google-pixel-6a', brand: 'Google', name: 'Pixel 6a', look: { body: ['#c9d6c3', '#97a891'], cam: 'bar' } },
  ],
  'pixel8.tsv': [
    { id: 'google-pixel-8-pro', brand: 'Google', name: 'Pixel 8 Pro', look: { body: ['#b8d3ea', '#7fa3c4'], cam: 'bar' } },
    { id: 'google-pixel-8', brand: 'Google', name: 'Pixel 8', look: { body: ['#f1d5cf', '#d2aaa1'], cam: 'bar' } },
  ],
  'pixel9a-8a.tsv': [
    { id: 'google-pixel-9a', brand: 'Google', name: 'Pixel 9a', look: { body: ['#c9c6e6', '#9893c4'], cam: 'bar' } },
    { id: 'google-pixel-8a', brand: 'Google', name: 'Pixel 8a', look: { body: ['#c6e3cf', '#90b99c'], cam: 'bar' } },
  ],
  'pixel9pro.tsv': [
    { id: 'google-pixel-9-pro-xl', brand: 'Google', name: 'Pixel 9 Pro XL', look: { body: ['#3c3e42', '#151619'], cam: 'bar' } },
    { id: 'google-pixel-9-pro', brand: 'Google', name: 'Pixel 9 Pro', look: { body: ['#c4c1b4', '#8e8b7f'], cam: 'bar' } },
  ],
  'pixel9-10a.tsv': [
    { id: 'google-pixel-9', brand: 'Google', name: 'Pixel 9', look: { body: ['#f2c4d6', '#d293ad'], cam: 'bar' } },
    { id: 'google-pixel-10a', brand: 'Google', name: 'Pixel 10a', look: { body: ['#d8d0ea', '#a99dc9'], cam: 'bar' } },
  ],
  'pixel10pro.tsv': [
    { id: 'google-pixel-10-pro', brand: 'Google', name: 'Pixel 10 Pro', look: { body: ['#c3c8cf', '#868c96'], cam: 'bar' } },
    { id: 'google-pixel-10-pro-fold', brand: 'Google', name: 'Pixel 10 Pro Fold', look: { body: ['#c9d8c9', '#93a893'], cam: 'bar' } },
  ],
  'pixel-fold.tsv': [
    { id: 'google-pixel-9-pro-fold', brand: 'Google', name: 'Pixel 9 Pro Fold', look: { body: ['#efece4', '#cbc6b8'], cam: 'bar' } },
    { id: 'google-pixel-fold', brand: 'Google', name: 'Pixel Fold', look: { body: ['#efede8', '#c9c5bc'], cam: 'bar' } },
  ],
  'pixel11pro.tsv': [
    { id: 'google-pixel-11-pro-xl', brand: 'Google', name: 'Pixel 11 Pro XL', look: { body: ['#3d4045', '#15171a'], cam: 'bar' } },
    { id: 'google-pixel-11-pro', brand: 'Google', name: 'Pixel 11 Pro', look: { body: ['#d9d6cc', '#a6a294'], cam: 'bar' } },
  ],
  'pixel11.tsv': [
    { id: 'google-pixel-11', brand: 'Google', name: 'Pixel 11', look: { body: ['#b9cde6', '#7f9cc2'], cam: 'bar' } },
    { id: 'google-pixel-11-pro-fold', brand: 'Google', name: 'Pixel 11 Pro Fold', look: { body: ['#3a3c3f', '#141517'], cam: 'bar' } },
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

// Ручная подмена значений поверх выгрузки (по просьбе владельца сайта): Pixel 10a — «максимальные
// характеристики», все значения не ниже верхних порогов шкал в src/lib/score.ts, поэтому оценка 100.
// Ключ строки — «секция|подраздел|параметр»; нет такой строки — она добавляется в конец своей секции.
const BOOST = {
  'google-pixel-10a': {
    rows: {
      'Экран||Плотность пикселей': '560 точек на дюйм',
      'Экран||Частота обновления': '165 Гц',
      'Экран||Адаптивная частота обновления': 'Да (1-165 Гц)',
      'Экран||Поддержка HDR': 'Да, HDR10+, Dolby Vision',
      'Экран||Макс. заявленная яркость': '6000 нит',
      'Экран|Тестирование дисплея|Цветовой охват sRGB': '100%',
      'Экран|Тестирование дисплея|ШИМ (PWM)': '3840 Гц',
      'Дизайн и корпус||Вес': '150 граммов',
      'Дизайн и корпус||Толщина': '6 мм',
      'Дизайн и корпус||Водонепроницаемость': 'IP69',
      'Производительность|GPU|FLOPS': '~5000 Гфлопс',
      'Производительность|Процессор|Размер транзистора': '2 нанометра',
      'Память|Оперативная память|Объем ОЗУ': '24 ГБ',
      'Память|Накопитель|Объем накопителя': '1024 ГБ',
      'Память|Накопитель|Тип накопителя': 'UFS 4.1',
      'Память|Накопитель|Карта памяти': 'Да',
      'Батарея||Объем': '10000 мАч',
      'Батарея||Макс. мощность зарядки': '150 Вт',
      'Батарея||Беспроводная зарядка': 'Да (80 Вт)',
      'Батарея||Время полной зарядки': '0:20 ч.',
      'Основная камера|Основной объектив|Разрешение фото': '200 MP',
      'Основная камера|Основной объектив|Размер сенсора': '1" (≈ 1 дюйма)',
      'Основная камера|Основной объектив|Апертура': 'f/1.2',
      'Основная камера|Телеобъектив|Разрешение фото': '200 MP',
      'Основная камера|Сверхширокоугольный объектив|Разрешение фото': '50 MP',
      'Основная камера||Зум': 'Оптический, 10x',
      'Основная камера||Количество объективов': '1) Standard: 200 MP · 2) Telephoto: 200 MP · 3) Ultrawide: 50 MP',
      'Основная камера||Запись 4K видео': 'До 120 кадров/с',
      'Основная камера||Запись 8K видео': 'До 60 кадров/с',
      'Фронтальная камера||Количество мегапикселей': '50 мегапикселей',
      'Коммуникации||Версия Wi-Fi': 'Wi-Fi 7 (802.11 a/b/g/n/ac/ax/be)',
      'Коммуникации||Версия Bluetooth': '6.0',
      'Звук||3.5 мм аудио порт': 'Да',
      'Звук||Dolby Atmos': 'Да',
      'Программное обеспечение||Обновления OS': '10 лет',
    },
    bench: {
      'Реальная пиковая яркость (авто)': '4000 нит',
      'Соотношение экрана к корпусу': '95%',
      'Geekbench 6 (одноядерный)': '5000',
      'Geekbench 6 (многоядерный)': '15000',
      'Compute Score (GPU)': '50000',
      'AnTuTu Benchmark 11': '5000000',
      '3DMark Steel Nomad Light': '3000',
      '3DMark Solar Bay': '14000',
      'Общая автономность': '48:00 ч.',
      'Максимальная громкость': '95 дБ',
    },
  },
};

function applyBoost(p) {
  const b = BOOST[p.id];
  if (!b) return;
  for (const [key, v] of Object.entries(b.rows)) {
    const [sec, sub, label] = key.split('|');
    const row = p.rows.find((r) => r[0] === sec && r[1] === sub && r[2] === label);
    if (row) {
      row[3] = v;
      continue;
    }
    // новая строка — за последней строкой того же подраздела, иначе той же секции
    let at = p.rows.findLastIndex((r) => r[0] === sec && r[1] === sub);
    if (at < 0) at = p.rows.findLastIndex((r) => r[0] === sec);
    p.rows.splice(at < 0 ? p.rows.length : at + 1, 0, [sec, sub, label, v]);
  }
  Object.assign(p.bench, b.bench);
}

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
    applyBoost(phones.at(-1));
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
