// Собирает единый кадр телефона: спина лежит поверх экрана и закрывает его на 25% ширины.
//   node scripts/combine.mjs [id …]      (без аргументов — все телефоны из research/parts)
//
// Исходные детали лежат в research/parts/<id>-front.webp и <id>-back.webp (вырезки с прозрачным фоном из
// scripts/cutout.mjs), результат — public/phones/<id>.webp.
//
// Откуда берётся спина:
//  • pure     — спина целиком отдельным кадром (Samsung, Xiaomi 17T Pro): просто кладём поверх экрана;
//  • keep     — композиция Apple, где спина уже лежит поверх экрана: берём как есть;
//  • complete — в композиции источника (Kimovil, старые iPhone) экран лежит ПОВЕРХ спины и закрывает её
//               правый край. Берём видимую часть спины и достраиваем скрытую полосу продолжением панели
//               (цвет по строкам, правый край — зеркало левого). Камеры и надписи лежат в видимой части,
//               поэтому они не искажаются; достроено только плоское стекло и кромка.
//  • split    — спина и экран стоят рядом, не перекрываясь (Poco F9 Ultra): режем по прозрачному зазору.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PARTS = path.join(root, 'research', 'parts');
const OUT = path.join(root, 'public', 'phones');

const OVERLAP = 0.25; // на сколько спина закрывает экран, доля ширины экрана
const HEIGHT = 640; // высота итогового кадра, px
// у этих композиций спина уже лежит поверх экрана (или это трёхмерная композиция Apple) — берём как есть
const KEEP = new Set(['apple-iphone-18-pro-max', 'apple-iphone-17-pro-max', 'apple-iphone-17-pro', 'apple-iphone-17', 'oppo-find-x9-ultra']);
const SPLIT = new Set(['xiaomi-poco-f9-ultra']);
const MARGIN = 10; // запас от края экрана в композиции: пиксели у самой кромки уже не спина

// Особые случаи достройки (координаты — в пикселях композиции высотой 640):
//  rows   — строки, где у края экрана стоит блок камер: цвет панели правее него берём интерполяцией по вертикали;
//  mirror — блок камер квадратный и закрыт наполовину: правую половину строим зеркалом левой (xI — левый край);
//  cap    — блок камер закрыт, но шире видимой части: заканчиваем его скруглённым краем у границы экрана.
const SPECS = {
  'vivo-x300-ultra': { rows: [14, 276], margin: 1 }, // кольцо камеры вплотную к экрану: не срезаем его край
  'xiaomi-redmi-note-15-pro-5g': { rows: [34, 240], mirror: { xI: 60, y0: 36, y1: 236 } },
  'xiaomi-17-pro-max': { rows: [12, 192], holdBottom: true, cap: { xI: 18, y0: 12, y1: 190, w: 16 } },
  'xiaomi-poco-f8-ultra': { texture: [190, 639], noReject: [10, 182] }, // серебристая плита камер идёт до края
  // у Pixel камера — полоса через всю ширину спины, её достраиваем как есть
  'google-pixel-10': { noReject: [20, 170] },
  'google-pixel-10-pro-xl': { noReject: [20, 170] },
};

const load = async (file, height) => {
  let img = sharp(file).ensureAlpha();
  if (height) img = img.resize({ height, kernel: 'lanczos3' });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};
const toSharp = (im) => sharp(im.data, { raw: { width: im.w, height: im.h, channels: 4 } });
const px = (im, x, y) => (y * im.w + x) * 4;

/** Левый край экранной половины в композиции: первый заметный вертикальный перепад возле ожидаемого места. */
function frontEdge(C, expected) {
  const lum = (x, y) => {
    const i = px(C, x, y);
    return 0.3 * C.data[i] + 0.59 * C.data[i + 1] + 0.11 * C.data[i + 2];
  };
  const y0 = Math.round(C.h * 0.25);
  const y1 = Math.round(C.h * 0.9);
  const E = [];
  for (let x = expected - 20; x <= expected + 12; x++) {
    let e = 0;
    for (let y = y0; y < y1; y++) e += Math.abs(lum(x + 1, y) - lum(x - 1, y));
    E.push([x, e / (y1 - y0)]);
  }
  const max = Math.max(...E.map((p) => p[1]));
  return E.find((p) => p[1] >= 0.45 * max)[0];
}

/** Спина целиком: видимая часть композиции + достроенная скрытая полоса справа. */
function completeBack(C, wb, edge, spec = {}) {
  const xb = edge - (spec.margin ?? MARGIN); // с этой колонки спина достроена
  const out = { data: Buffer.alloc(wb * C.h * 4), w: wb, h: C.h };

  const inside = (r, y) => r && y >= r[0] && y <= r[1];
  const trimmed = (a) => {
    a.sort((p, q) => p - q);
    const k = Math.floor(a.length * 0.2);
    const mid = a.slice(k, a.length - k);
    return Math.round(mid.reduce((s, v) => s + v, 0) / mid.length);
  };
  // медианы и сглаживание считаем только по существующим строкам: у верхнего и нижнего края окно просто короче
  const around = (arr, y, r, c) => {
    const v = [];
    for (let k = Math.max(0, y - r); k <= Math.min(C.h - 1, y + r); k++) v.push(arr[k][c]);
    return v.sort((p, q) => p - q)[v.length >> 1];
  };
  // Цвет панели по строкам в окне win: усечённое среднее (устойчиво к бликам и рисунку ткани), строки без данных
  // берём у соседних, блок камер у края (rows) закрываем интерполяцией, выбросы (логотип) заменяем медианой по
  // большому окну, затем медиана по вертикали убирает полосы от надписей и лёгкое сглаживание.
  const panel = (win) => {
    const S = [];
    for (let y = 0; y < C.h; y++) {
      const ch = [[], [], []];
      for (let x = win[0]; x <= win[1]; x++) {
        const i = px(C, x, y);
        if (C.data[i + 3] < 200) continue;
        for (let c = 0; c < 3; c++) ch[c].push(C.data[i + c]);
      }
      S.push(ch[0].length ? ch.map(trimmed) : null);
    }
    for (let y = 0; y < C.h; y++) if (!S[y]) S[y] = S.slice(y).find(Boolean) ?? S.slice(0, y).reverse().find(Boolean);
    if (spec.rows) {
      const [a, b] = spec.rows;
      const bottom = S[Math.min(C.h - 1, b + 1)];
      // блок почти у верхнего края — цвета выше него нет, держим цвет ниже
      const top = spec.holdBottom ? bottom : S[Math.max(0, a - 1)];
      for (let y = a; y <= b; y++) S[y] = top.map((v, c) => Math.round(v + ((bottom[c] - v) * (y - a)) / (b - a)));
    }
    const wide = S.map((_, y) => [0, 1, 2].map((c) => around(S, y, 80, c)));
    for (let y = 0; y < C.h; y++) {
      if (inside(spec.noReject, y)) continue; // полоса камер через всю ширину (Pixel): это не выброс
      if (Math.max(...S[y].map((v, c) => Math.abs(v - wide[y][c]))) > 5) S[y] = wide[y];
    }
    // чёткие строки (полоса камер, блок камер у края) не сглаживаем по вертикали, иначе края полосы поплывут
    const smooth = S.map((_, y) => (inside(spec.noReject, y) ? S[y] : [0, 1, 2].map((c) => around(S, y, 15, c))));
    return smooth.map((_, y) => {
      if (inside(spec.noReject, y)) return smooth[y];
      const acc = [0, 0, 0];
      let n = 0;
      for (let k = Math.max(0, y - 4); k <= Math.min(C.h - 1, y + 4); k++, n++) for (let c = 0; c < 3; c++) acc[c] += smooth[k][c];
      return acc.map((v) => Math.round(v / n));
    });
  };
  // у границы экрана (окно отступает от кромки: туда ложится отсвет рамки экрана) и у левого края — правый
  // край зеркален левому, так что панель плавно переходит от первого цвета ко второму
  const flat = panel([xb - 32, xb - 12]);
  const edgeColor = panel([10, 22]).map((e, y) => (Math.max(...e.map((v, c) => Math.abs(v - flat[y][c]))) > 28 ? flat[y] : e)); // у левого края камера — не тянем её цвет
  const ease = (u) => u * u * (3 - 2 * u);
  if (process.env.DEBUG) console.log(`   edge ${edge} xb ${xb} wb ${wb} flat[300]=${flat[300]} edge[300]=${edgeColor[300]}`);

  const RIM = 3; // кромка корпуса: зеркало левой
  const FADE = 20; // плавный переход от настоящих пикселей к достроенным
  const CORNER = Math.round(0.14 * wb); // зона правых скруглённых углов: контур берём зеркалом левых
  for (let y = 0; y < C.h; y++) {
    const keep = inside(spec.rows, y) || inside(spec.texture, y) || inside(spec.noReject, y); // рядом с камерой и на ткани ничего не размываем
    for (let x = 0; x < wb; x++) {
      const o = px(out, x, y);
      if (x < xb) {
        const i = px(C, x, y);
        const t = keep ? 0 : Math.max(0, (x - (xb - FADE)) / FADE); // 0 … 1 перед границей
        for (let c = 0; c < 3; c++) out.data[o + c] = Math.round(C.data[i + c] * (1 - t) + flat[y][c] * t);
        out.data[o + 3] = C.data[i + 3];
      } else {
        const m = px(C, wb - 1 - x, y); // зеркальная точка видимой части: даёт скруглённый контур справа
        const rim = x >= wb - RIM;
        const u = ease((x - xb) / (wb - RIM - xb));
        for (let c = 0; c < 3; c++) out.data[o + c] = rim ? C.data[m + c] : Math.round(flat[y][c] + (edgeColor[y][c] - flat[y][c]) * u);
        // прямой участок контура продолжаем как есть, скругление в углу берём зеркалом
        out.data[o + 3] = x < wb - CORNER ? C.data[px(C, xb - 1, y) + 3] : C.data[m + 3];
      }
    }
  }

  const copy = (x, y, sx) => {
    const i = px(C, sx, y);
    const o = px(out, x, y);
    for (let c = 0; c < 4; c++) out.data[o + c] = C.data[i + c];
  };
  if (spec.texture) {
    // фактура (ткань, матовое покрытие): продолжаем зеркальным отражением соседней полосы, цвет сохраняется
    for (let y = spec.texture[0]; y <= spec.texture[1] && y < C.h; y++) {
      for (let x = xb; x < wb - RIM; x++) {
        const sx = 2 * xb - 1 - x;
        if (sx < 0) break;
        const i = px(C, sx, y);
        const o = px(out, x, y);
        for (let c = 0; c < 3; c++) out.data[o + c] = C.data[i + c];
      }
    }
  }
  if (spec.mirror) {
    // квадратный блок камер закрыт примерно наполовину: правая половина — зеркало левой
    const { xI, y0, y1 } = spec.mirror;
    const xR = xI + (y1 - y0);
    const cx = (xI + xR) / 2;
    for (let y = y0; y <= y1; y++) for (let x = Math.ceil(cx); x <= xR && x < wb; x++) copy(x, y, Math.round(2 * cx - x));
  }
  if (spec.cap) {
    // блок камер шире видимой части: правый край — зеркало левого, у границы экрана
    const { xI, y0, y1, w } = spec.cap;
    for (let y = y0; y <= y1; y++) for (let k = 0; k < w; k++) copy(xb - 1 - k, y, xI + k);
  }
  return out;
}

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

/** Тень от спины на экране: мягкая, только в пределах самого экрана. */
async function shadowOnFront(back, front, canvasW, x0) {
  const k = back.h / 640;
  const a = Buffer.alloc(canvasW * back.h * 4);
  const dx = Math.round(10 * k);
  const dy = Math.round(8 * k);
  for (let y = 0; y < back.h; y++) {
    for (let x = 0; x < back.w; x++) {
      const tx = x + dx;
      const ty = y + dy;
      if (tx >= canvasW || ty >= back.h) continue;
      a[px({ w: canvasW }, tx, ty) + 3] = Math.round(back.data[px(back, x, y) + 3] * 0.55);
    }
  }
  const blurred = await sharp(a, { raw: { width: canvasW, height: back.h, channels: 4 } }).blur(14 * k).png().toBuffer();
  const frontLayer = await sharp({ create: { width: canvasW, height: back.h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await toSharp(front).png().toBuffer(), left: x0, top: 0 }])
    .png()
    .toBuffer();
  return sharp(blurred).composite([{ input: frontLayer, blend: 'dest-in' }]).png().toBuffer();
}

async function build(id) {
  const frontFile = path.join(PARTS, `${id}-front.webp`);
  const backFile = path.join(PARTS, `${id}-back.webp`);
  const info = await sharp(backFile).metadata();
  const ratio = info.width / info.height;

  let back;
  let front;
  let mode;
  if (KEEP.has(id)) {
    mode = 'keep';
    const kept = await load(backFile, HEIGHT);
    return finish(id, mode, await toSharp(kept).png().toBuffer());
  } else if (SPLIT.has(id)) {
    mode = 'split';
    ({ back, front } = splitPair(await load(backFile, HEIGHT)));
    // экран из той же композиции: тот же рендер, что и спина
  } else if (ratio < 0.6) {
    mode = 'pure';
    back = await load(backFile, HEIGHT);
    front = await load(frontFile, HEIGHT);
  } else {
    mode = 'complete';
    const C = await load(backFile, HEIGHT);
    front = await load(frontFile, HEIGHT);
    const wb = Math.round((front.w / front.h) * C.h);
    const edge = frontEdge(C, C.w - wb);
    back = completeBack(C, wb, edge, SPECS[id]);
  }

  const ov = Math.round(OVERLAP * front.w);
  const x0 = back.w - ov;
  const width = x0 + front.w;
  const frontBuf = await toSharp(front).png().toBuffer();
  const shadow = await shadowOnFront(back, front, width, x0);
  const png = await sharp({ create: { width, height: HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: frontBuf, left: x0, top: 0 },
      { input: shadow, left: 0, top: 0 },
      { input: await toSharp(back).png().toBuffer(), left: 0, top: 0 },
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
