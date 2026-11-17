// Собирает единый кадр телефона: экран лежит поверх спины и закрывает её на 25% ширины.
//   node scripts/combine.mjs [id …]      (без аргументов — все телефоны: таблица scripts/kimovil.mjs + присланные)
//
// Исходные детали лежат в research/parts/, результат — public/phones/<id>.webp. Режим сборки:
//  • user — есть <id>-user.webp: готовый кадр, присланный вручную (scripts/user-photo.mjs); главнее всего
//           остального, берём как есть и только чистим кромку;
//  • pure — по таблице Kimovil: спина (<id>-back.webp) отдельным кадром, кладём экран (<id>-front.webp) поверх;
//  • keep — по таблице Kimovil: готовая композиция «спина + экран» с экраном сверху, берём как есть.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TABLE } from './kimovil.mjs';
import { refineEdge } from './edge.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PARTS = path.join(root, 'research', 'parts');
const OUT = path.join(root, 'public', 'phones');

const OVERLAP = 0.25; // на сколько экран закрывает спину, доля ширины спины
const HEIGHT = 640; // высота итогового кадра, px

const load = async (file, height) => {
  let img = sharp(file).ensureAlpha();
  if (height) img = img.resize({ height, kernel: 'lanczos3' });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};
const toSharp = (im) => sharp(im.data, { raw: { width: im.w, height: im.h, channels: 4 } });
const px = (im, x, y) => (y * im.w + x) * 4;

/** Тень от экрана на спине: мягкая, только в пределах самой спины. */
async function shadowOnBack(back, front, canvasW, x0) {
  const k = front.h / 640;
  const a = Buffer.alloc(canvasW * front.h * 4);
  const dx = -Math.round(10 * k);
  const dy = Math.round(8 * k);
  for (let y = 0; y < front.h; y++) {
    for (let x = 0; x < front.w; x++) {
      const tx = x0 + x + dx;
      const ty = y + dy;
      if (tx < 0 || tx >= canvasW || ty >= front.h) continue;
      a[px({ w: canvasW }, tx, ty) + 3] = Math.round(front.data[px(front, x, y) + 3] * 0.55);
    }
  }
  const blurred = await sharp(a, { raw: { width: canvasW, height: front.h, channels: 4 } }).blur(14 * k).png().toBuffer();
  const backLayer = await sharp({ create: { width: canvasW, height: front.h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await toSharp(back).png().toBuffer(), left: 0, top: 0 }])
    .png()
    .toBuffer();
  return sharp(blurred).composite([{ input: backLayer, blend: 'dest-in' }]).png().toBuffer();
}

async function build(id) {
  const frontFile = path.join(PARTS, `${id}-front.webp`);
  const backFile = path.join(PARTS, `${id}-back.webp`);
  const userFile = path.join(PARTS, `${id}-user.webp`);
  if (fs.existsSync(userFile)) {
    const im = await load(userFile, HEIGHT);
    refineEdge(im.data, im.w, im.h); // кромку чистим уже на итоговом размере
    return finish(id, 'user', await toSharp(im).png().toBuffer());
  }
  if (!TABLE[id]) throw new Error(`нет ни присланного кадра, ни строки в таблице scripts/kimovil.mjs: ${id}`);
  if (TABLE[id].keep) return finish(id, 'keep', await toSharp(await load(backFile, HEIGHT)).png().toBuffer());

  const mode = 'pure';
  const back = await load(backFile, HEIGHT);
  const front = await load(frontFile, HEIGHT);

  const x0 = back.w - Math.round(OVERLAP * back.w);
  const width = x0 + front.w;
  const png = await sharp({ create: { width, height: HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: await toSharp(back).png().toBuffer(), left: 0, top: 0 },
      { input: await shadowOnBack(back, front, width, x0), left: 0, top: 0 },
      { input: await toSharp(front).png().toBuffer(), left: x0, top: 0 },
    ])
    .png()
    .toBuffer();
  return finish(id, mode, png);
}

async function finish(id, mode, png) {
  // обрезаем пустые поля по прозрачности и сохраняем WebP с альфой
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let [x0, y0, x1, y1] = [info.width, info.height, -1, -1];
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  const file = path.join(OUT, `${id}.webp`);
  await sharp(png)
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .webp({ quality: 90, alphaQuality: 100, effort: 5 })
    .toFile(file);
  const m = await sharp(file).metadata();
  console.log(`${id.padEnd(30)} ${mode.padEnd(8)} ${m.width}x${m.height}  ${(fs.statSync(file).size / 1024).toFixed(0)} КБ`);
}

const ids = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const user = fs
  .readdirSync(PARTS)
  .filter((f) => f.endsWith('-user.webp'))
  .map((f) => f.replace(/-user\.webp$/, ''));
for (const id of ids.length ? ids : [...new Set([...Object.keys(TABLE), ...user])]) await build(id);
