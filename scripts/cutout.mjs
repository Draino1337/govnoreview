// Готовит картинку телефона для сайта:
//   node scripts/cutout.mjs <вход> <выход.webp> [--height=900] [--upscale=640] [--crop=x,y,w,h] [--tol=18] [--erode=1] [--bg=keep]
// 1) обрезает прозрачные поля (у Apple, например, полотно квадратное, а картинка внутри — прямоугольник 16:9);
// 2) если по углам фон непрозрачный — вырезает однотонную подложку заливкой от краёв (мягкая кромка, без «ореола»);
// 3) масштабирует до нужной высоты (маленькие исходники растит с Lanczos и лёгкой резкостью) и сохраняет WebP с альфой.
import sharp from 'sharp';

const [input, output, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.map((o) => o.replace(/^--/, '').split('=')));
const H = +(opt.height ?? 900);
const TOL = +(opt.tol ?? 18);
const ERODE = +(opt.erode ?? 1); // на сколько пикселей сдвинуть границу внутрь при вырезке фона
const UP = +(opt.upscale ?? 0);
const crop = opt.crop?.split(',').map(Number);

let pipe = sharp(input).ensureAlpha();
if (crop) pipe = pipe.extract({ left: crop[0], top: crop[1], width: crop[2], height: crop[3] });
let { data, info } = await pipe.raw().toBuffer({ resolveWithObject: true });
let w = info.width;
let h = info.height;

/** рамка по непрозрачным пикселям: [x0, y0, x1, y1] */
function alphaBox(min = 10) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > min) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : [x0, y0, x1, y1];
}

const rawOf = (buf, bw, bh) => sharp(buf, { raw: { width: bw, height: bh, channels: 4 } });

// 1) обрезаем прозрачные поля
{
  const b = alphaBox();
  if (!b) throw new Error('пустая картинка');
  ({ data, info } = await rawOf(data, w, h)
    .extract({ left: b[0], top: b[1], width: b[2] - b[0] + 1, height: b[3] - b[1] + 1 })
    .raw()
    .toBuffer({ resolveWithObject: true }));
  w = info.width;
  h = info.height;
}

function removeBackground() {
  const idx = (x, y) => (y * w + x) * 4;
  // Цвет фона берём по четырём углам (патчи 4×4): у кадров, обрезанных вплотную, по бокам виден сам телефон.
  const corners = [[0, 0], [w - 4, 0], [0, h - 4], [w - 4, h - 4]].map(([px, py]) => {
    const pix = [];
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) pix.push(idx(px + x, py + y));
    const med = (c) => pix.map((i) => data[i + c]).sort((a, b) => a - b)[8];
    return [med(0), med(1), med(2)];
  });
  const bg = [0, 1, 2].map((c) => corners.map((k) => k[c]).sort((a, b) => a - b)[1]);
  const spread = Math.max(...corners.map((k) => Math.hypot(k[0] - bg[0], k[1] - bg[1], k[2] - bg[2])));
  if (spread > 40) console.warn(`  ! углы разного цвета (разброс ${spread.toFixed(0)}) — фон может вырезаться плохо`);
  const dist = (i) => Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]);

  const gone = new Uint8Array(w * h);
  const stack = [];
  const visit = (x, y) => {
    const k = y * w + x;
    if (!gone[k] && dist(k * 4) <= TOL) {
      gone[k] = 1;
      stack.push(k);
    }
  };
  for (let x = 0; x < w; x++) {
    visit(x, 0);
    visit(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    visit(0, y);
    visit(w - 1, y);
  }
  while (stack.length) {
    const k = stack.pop();
    const x = k % w;
    const y = (k / w) | 0;
    if (x > 0) visit(x - 1, y);
    if (x < w - 1) visit(x + 1, y);
    if (y > 0) visit(x, y - 1);
    if (y < h - 1) visit(x, y + 1);
  }

  // JPEG-кайма: съедаем внешний слой пикселей, в нём смесь цвета телефона и фона
  for (let pass = 0; pass < ERODE; pass++) {
    const rim = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const k = y * w + x;
        if (!gone[k] && (gone[k - 1] || gone[k + 1] || gone[k - w] || gone[k + w])) rim.push(k);
      }
    }
    for (const k of rim) gone[k] = 1;
  }

  // мягкая кромка: пиксели, соседние с фоном, получают прозрачность по расстоянию до цвета фона
  const soft = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const k = y * w + x;
      if (gone[k]) continue;
      if (gone[k - 1] || gone[k + 1] || gone[k - w] || gone[k + w]) soft.push(k);
    }
  }
  for (const k of soft) {
    const i = k * 4;
    const a = Math.min(1, Math.max(0, (dist(i) - TOL * 0.4) / (TOL * 2.2)));
    for (let c = 0; c < 3; c++) data[i + c] = Math.max(0, Math.min(255, Math.round((data[i + c] - bg[c] * (1 - a)) / Math.max(a, 0.05))));
    data[i + 3] = Math.round(a * 255);
  }
  for (let k = 0; k < w * h; k++) if (gone[k]) data[k * 4 + 3] = 0;
}

// 2) если по углам фон непрозрачный — это подложка, вырезаем её
const opaqueCorners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].every(([x, y]) => data[(y * w + x) * 4 + 3] >= 250);
const removed = opaqueCorners && opt.bg !== 'keep';
if (removed) removeBackground();

// 3) ещё раз обрезаем поля (уже по результату вырезки), масштабируем, сохраняем
const b = alphaBox();
if (!b) throw new Error('пустая картинка после вырезки');
const cropH = b[3] - b[1] + 1;
const targetH = cropH < UP ? UP : H;
let out = rawOf(data, w, h)
  .extract({ left: b[0], top: b[1], width: b[2] - b[0] + 1, height: cropH })
  .resize({ height: targetH, withoutEnlargement: cropH >= UP, kernel: 'lanczos3' });
if (cropH < UP) out = out.sharpen({ sigma: 0.7 });
await out.webp({ quality: 90, alphaQuality: 100, effort: 5 }).toFile(output);

const m = await sharp(output).metadata();
console.log(`${output}  ${m.width}x${m.height}  ${removed ? 'фон вырезан (tol=' + TOL + ')' : 'прозрачность из источника'}${cropH < UP ? '  (исходник ' + cropH + 'px, увеличен)' : ''}`);
