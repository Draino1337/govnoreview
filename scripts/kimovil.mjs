// Вырезки телефонов из галерей Kimovil: research/parts/<id>-front.webp и <id>-back.webp.
//   node scripts/kimovil.mjs [id …]      (без аргументов — все телефоны из таблицы)
// Дальше кадр собирает scripts/combine.mjs.
//
// Номера кадров: p<n> — снимок «вид спереди» (phone_front), d<n> — кадр галереи (default); n — число из имени
// файла thumb_<n>_…_big.jpg на cdn-files.kimovil.com. Больше размера _big Kimovil не отдаёт.
// Исходники кэшируются в research/img-src/<id>/ (папка в .gitignore).
//
// Экран — всегда снимок спереди Kimovil. Спина — по возможности отдельный кадр спины того же цвета, что и
// обои на экране; тогда combine.mjs кладёт экран поверх спины (режим pure). Где у Kimovil нет отдельной спины,
// берём готовую композицию «спина + экран» с экраном сверху (режим keep).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'research', 'img-src');
const PARTS = path.join(root, 'research', 'parts');

// back: кадр со спиной; opts — параметры scripts/cutout.mjs для обеих вырезок, backOpts — только для спины.
//   --blob=largest  в кадре рядом со спиной стоит профиль телефона, оставляем только спину
//   --crop + --mirror=right  спина лежит поверх экрана: режем по правой кромке спины, углы повторяем с левой
//   --mirror=bottom  под телефоном снят «отблеск пола»: срезаем его, нижние углы повторяем с верхних
// keep: кадр со спиной — это готовая композиция «спина + экран».
export const TABLE = {
  'samsung-galaxy-s26-ultra': { front: 'p1202118', back: 'd1202113' },
  'samsung-galaxy-s25-ultra': { front: 'p1035304', back: 'd1035322' },
  'samsung-galaxy-s25': { front: 'p1035258', back: 'd1035289' },
  'samsung-galaxy-s25-fe': { front: 'p1130207', back: 'd1132078' },
  'samsung-galaxy-a57-5g': { front: 'p1220378', back: 'd1220379', keep: true },
  'samsung-galaxy-a56-5g': { front: 'p1048638', back: 'd1052726' },
  'apple-iphone-18-pro-max': { front: 'p1287207', back: 'd1287132', backOpts: ['--blob=largest'] },
  'apple-iphone-17-pro-max': { front: 'p1133112', back: 'd1133108', backOpts: ['--blob=largest'] },
  'apple-iphone-17-pro': { front: 'p1133102', back: 'd1133092', backOpts: ['--blob=largest'] },
  'apple-iphone-17': { front: 'p1133088', back: 'd1133073', backOpts: ['--blob=largest'] },
  'apple-iphone-16-pro-max': { front: 'p975674', back: 'd975661', backOpts: ['--blob=largest'] },
  'apple-iphone-16': { front: 'p975708', back: 'd975712', backOpts: ['--blob=largest'] },
  'apple-iphone-15': { front: 'p820071', back: 'd820072', backOpts: ['--blob=largest'] },
  'google-pixel-10-pro-xl': { front: 'p1120732', back: 'd1120739', opts: ['--mirror=bottom'] },
  'google-pixel-10': { front: 'p1120715', back: 'd1120705', opts: ['--mirror=bottom'] },
  'xiaomi-17-pro-max': { front: 'p1139718', back: 'd1139713', keep: true },
  'xiaomi-17t-pro': { front: 'p1244241', back: 'd1244237' },
  'xiaomi-poco-x8-pro-max': { front: 'p1217581', back: 'd1217557' },
  'xiaomi-poco-f8-pro': { front: 'p1166693', back: 'd1166678', keep: true },
  'xiaomi-poco-f8-ultra': { front: 'p1166676', back: 'd1166667' },
  'xiaomi-poco-f9-ultra': { front: 'p1281503', back: 'd1281548' },
  'xiaomi-redmi-note-17-pro': { front: 'p1264556', back: 'd1264555', keep: true },
  'xiaomi-redmi-note-15-pro-5g': { front: 'p1170334', back: 'd1170320', keep: true },
  'oneplus-16': { front: 'p1300848', back: 'd1300845', keep: true },
  'oneplus-15': { front: 'p1149050', back: 'd1149027', keep: true },
  'vivo-x300-ultra': { front: 'p1223349', back: 'd1222302' },
  'oppo-find-x9-ultra': { front: 'p1223378', back: 'd1228191', backOpts: ['--crop=170,100,361,760', '--mirror=right'] },
};

const url = (ref) => {
  const n = +ref.slice(1);
  const dir = `${String(Math.floor(n / 100000) + 1).padStart(4, '0')}/${String(Math.floor((n % 100000) / 1000) + 1).padStart(2, '0')}`;
  return ref[0] === 'p'
    ? `https://cdn-files.kimovil.com/phone_front/${dir}/thumb_${n}_phone_front_big.jpg`
    : `https://cdn-files.kimovil.com/default/${dir}/thumb_${n}_default_big.jpg`;
};

async function source(id, ref) {
  const file = path.join(SRC, id, `${ref}.jpg`);
  if (fs.existsSync(file)) return file;
  const res = await fetch(url(ref), { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.kimovil.com/' } });
  if (!res.ok) throw new Error(`${id}: ${ref} → HTTP ${res.status}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

const cutout = (input, output, opts = []) =>
  process.stdout.write(execFileSync('node', [path.join(root, 'scripts', 'cutout.mjs'), input, output, '--upscale=640', '--erode=0', ...(opts ?? [])]));

const main = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const ids = main ? process.argv.slice(2) : [];
for (const id of !main ? [] : ids.length ? ids : Object.keys(TABLE)) {
  const t = TABLE[id];
  if (!t) throw new Error(`нет в таблице: ${id}`);
  cutout(await source(id, t.front), path.join(PARTS, `${id}-front.webp`), t.opts);
  cutout(await source(id, t.back), path.join(PARTS, `${id}-back.webp`), [...(t.opts ?? []), ...(t.backOpts ?? [])]);
}
