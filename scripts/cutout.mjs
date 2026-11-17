// Готовит картинку телефона для сайта:
//   node scripts/cutout.mjs <вход> <выход.webp> [--height=900] [--crop=x,y,w,h] [--tol=18] [--bg=keep]
// 1) если у картинки уже есть прозрачность — берёт как есть;
// 2) иначе вырезает однотонный фон заливкой от краёв (с мягкой кромкой и снятием «ореола»);
// 3) обрезает пустые поля, масштабирует до нужной высоты и сохраняет в WebP с альфой.
import sharp from 'sharp';

const [input, output, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.map((o) => o.replace(/^--/, '').split('=')));
const H = +(opt.height ?? 900);
const TOL = +(opt.tol ?? 18);
const crop = opt.crop?.split(',').map(Number);

let pipe = sharp(input).ensureAlpha();
if (crop) pipe = pipe.extract({ left: crop[0], top: crop[1], width: crop[2], height: crop[3] });
const { data, info } = await pipe.raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;

let see = 0;
for (let i = 3; i < data.length; i += 4) if (data[i] < 250) see++;
const hasAlpha = see / (w * h) > 0.05;

function removeBackground() {
  const idx = (x, y) => (y * w + x) * 4;
  const edge = [];
  for (let x = 0; x < w; x++) edge.push(idx(x, 0), idx(x, h - 1));
  for (let y = 0; y < h; y++) edge.push(idx(0, y), idx(w - 1, y));
  const med = (c) => {
    const v = edge.map((i) => data[i + c]).sort((a, b) => a - b);
    return v[v.length >> 1];
  };
  const bg = [med(0), med(1), med(2)];
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

if (!hasAlpha && opt.bg !== 'keep') removeBackground();

// рамка по непрозрачным пикселям
let x0 = w, y0 = h, x1 = -1, y1 = -1;
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > 10) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
}
if (x1 < 0) throw new Error('пустая картинка после вырезки');

await sharp(data, { raw: { width: w, height: h, channels: 4 } })
  .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
  .resize({ height: H, withoutEnlargement: true, kernel: 'lanczos3' })
  .webp({ quality: 90, alphaQuality: 100, effort: 5 })
  .toFile(output);

const m = await sharp(output).metadata();
console.log(`${output}  ${m.width}x${m.height}  ${hasAlpha ? 'alpha из источника' : 'фон вырезан (tol=' + TOL + ')'}`);
