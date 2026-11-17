// Собирает единый кадр телефона: экран лежит поверх спины и закрывает её на 25% ширины.
//   node scripts/combine.mjs [id …]      (без аргументов — все телефоны из research/parts)
//
// Исходные детали лежат в research/parts/<id>-front.webp и <id>-back.webp (вырезки с прозрачным фоном из
// scripts/cutout.mjs), результат — public/phones/<id>.webp.
//
// Откуда берётся кадр:
//  • keep  — готовая композиция источника «спина + экран» (Kimovil, Apple, Oppo): берём как есть, ничего не
//            дорисовываем;
//  • pure  — спина целиком отдельным кадром (Samsung, Xiaomi 17T Pro): кладём экран поверх спины;
//  • split — спина и экран стоят рядом, не перекрываясь (Poco F9 Ultra): режем по зазору и кладём экран поверх.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PARTS = path.join(root, 'research', 'parts');
const OUT = path.join(root, 'public', 'phones');

const OVERLAP = 0.25; // на сколько экран закрывает спину, доля ширины спины
const HEIGHT = 640; // высота итогового кадра, px
// композиция Apple с узкой рамкой (отношение сторон < 0.6), но это уже готовый кадр «спина + экран»
const KEEP = new Set(['apple-iphone-17']);
const SPLIT = new Set(['xiaomi-poco-f9-ultra']);

const load = async (file, height) => {
  let img = sharp(file).ensureAlpha();
  if (height) img = img.resize({ height, kernel: 'lanczos3' });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};
const toSharp = (im) => sharp(im.data, { raw: { width: im.w, height: im.h, channels: 4 } });
const px = (im, x, y) => (y * im.w + x) * 4;

/** Спина и экран стоят рядом: разрезаем по первому прозрачному зазору посередине. */
function splitPair(C) {
  const empty = (x) => {
    for (let y = 0; y < C.h; y++) if (C.data[px(C, x, y) + 3] > 8) return false;
    return true;
  };
  let a = -1;
  let b = -1;
  for (let x = Math.round(C.w * 0.3); x < Math.round(C.w * 0.7); x++) {
    if (empty(x)) {
      if (a < 0) a = x;
      b = x;
    } else if (a >= 0) break;
  }
  if (a < 0) throw new Error('нет прозрачного зазора между спиной и экраном');
  const cut = (x0, x1) => {
    const w = x1 - x0;
    const data = Buffer.alloc(w * C.h * 4);
    for (let y = 0; y < C.h; y++) C.data.copy(data, y * w * 4, px(C, x0, y), px(C, x1, y));
    return { data, w, h: C.h };
  };
  return { back: cut(0, a), front: cut(b + 1, C.w) };
}

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
  const info = await sharp(backFile).metadata();

  let back;
  let front;
  let mode;
  if (SPLIT.has(id)) {
    mode = 'split';
    ({ back, front } = splitPair(await load(backFile, HEIGHT)));
  } else if (KEEP.has(id) || info.width / info.height >= 0.6) {
    // широкий кадр — это уже композиция «спина + экран»
    return finish(id, 'keep', await toSharp(await load(backFile, HEIGHT)).png().toBuffer());
  } else {
    mode = 'pure';
    back = await load(backFile, HEIGHT);
    front = await load(frontFile, HEIGHT);
  }

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
const all = fs
  .readdirSync(PARTS)
  .filter((f) => f.endsWith('-back.webp'))
  .map((f) => f.replace(/-back\.webp$/, ''));
fs.mkdirSync(OUT, { recursive: true });
for (const id of ids.length ? ids : all) await build(id);
