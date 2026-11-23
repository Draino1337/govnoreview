// Готовые кадры «спина + экран», присланные вручную (PNG с прозрачным фоном):
//   node scripts/user-photo.mjs <папка или файлы …>
//
// Телефон определяется по имени файла: «<бренд> <модель>.png», как в src/data/phones.json
// (например «Samsung Galaxy S26 Ultra.png»). Неизвестные имена пропускаются с предупреждением.
// Альфа чистится (scripts/edge.mjs → cleanAlpha): почти прозрачная дымка вокруг телефона убирается, корпус
// делается сплошным. Результат — research/parts/<id>-user.webp в исходном размере; его подхватывает
// scripts/combine.mjs (режим user, приоритетнее таблицы Kimovil) и пересобирает public/phones/<id>.webp.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cleanAlpha } from './edge.mjs';

sharp.cache(false); // иначе Windows держит исходники открытыми
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PARTS = path.join(root, 'research', 'parts');
const phones = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'phones.json'), 'utf8'));
const list = Array.isArray(phones) ? phones : phones.phones ?? Object.values(phones);
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9а-яё]+/g, ' ').trim();
const byName = new Map(list.map((p) => [norm(`${p.brand} ${p.name}`), p.id]));
// у Fairphone бренд уже в названии модели («Fairphone 6»): такой файл зовётся просто «Fairphone 6.png»
for (const p of list) if (norm(p.name).startsWith(norm(p.brand))) byName.set(norm(p.name), p.id);
console.assert(byName.get('fairphone 6') === 'fairphone-6', 'Fairphone 6.png должен находить fairphone-6');

const files = process.argv
  .slice(2)
  .flatMap((a) => (fs.statSync(a).isDirectory() ? fs.readdirSync(a).map((f) => path.join(a, f)) : [a]))
  .filter((f) => /\.(png|webp)$/i.test(f));
if (!files.length) throw new Error('нет PNG/WebP: node scripts/user-photo.mjs <папка или файлы>');

const done = [];
for (const file of files) {
  const id = byName.get(norm(path.basename(file).replace(/\.\w+$/, '')));
  if (!id) {
    console.warn(`  ? не понял, какой это телефон: ${path.basename(file)}`);
    continue;
  }
  const { data, info } = await sharp(fs.readFileSync(file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (!info.hasAlpha && data[3] === 255) console.warn(`  ! ${path.basename(file)}: нет прозрачности`);
  const haze = cleanAlpha(data, info.width, info.height);
  const out = path.join(PARTS, `${id}-user.webp`);
  // обрезаем пустые поля и сохраняем почти без потерь — это исходник для сборки
  const trimmed = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer()
    .then((b) => sharp(b).trim({ threshold: 0 }).toBuffer());
  await sharp(trimmed).webp({ quality: 95, alphaQuality: 100, effort: 5 }).toFile(out);
  const m = await sharp(out).metadata();
  console.log(`${id.padEnd(30)} ${m.width}x${m.height}  дымка убрана: ${haze} px`);
  done.push(id);
}
if (done.length) execFileSync('node', [path.join(root, 'scripts', 'combine.mjs'), ...done], { stdio: 'inherit' });
