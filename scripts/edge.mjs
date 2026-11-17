// Общая обработка кромки вырезок (raw RGBA, 4 канала): используют cutout.mjs, user-photo.mjs и combine.mjs.

/**
 * Чистовая кромка — на итоговом размере, после масштабирования (иначе растянутая «лесенка» вылезет снова).
 *  1) Контур: альфу размываем гауссом и снова поднимаем контраст вокруг середины — получается ровная гладкая
 *     линия со сглаживанием в 1–1.5 px, без ступенек и крапинок. Порог чуть сдвинут внутрь (inward), чтобы
 *     от светлой каймы не осталось и следа.
 *  2) Цвет: у полупрозрачных пикселей кромки цвет — это смесь телефона с фоном. Заменяем его цветом ближайших
 *     сплошных пикселей телефона, тогда на тёмном фоне сайта по краю нет белёсого ореола.
 */
export function refineEdge(px, W, H, { sigma = 1, inward = 0.06 } = {}) {
  if (!(sigma > 0)) return;
  const A = new Float32Array(W * H);
  for (let k = 0; k < W * H; k++) A[k] = px[k * 4 + 3] / 255;
  // разделимое гауссово размытие альфы
  const r = Math.ceil(sigma * 3);
  const kern = Array.from({ length: 2 * r + 1 }, (_, i) => Math.exp(-((i - r) ** 2) / (2 * sigma ** 2)));
  const ks = kern.reduce((s, v) => s + v, 0);
  const tmp = new Float32Array(W * H);
  const B = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let i = -r; i <= r; i++) s += kern[i + r] * A[y * W + Math.min(W - 1, Math.max(0, x + i))];
      tmp[y * W + x] = s / ks;
    }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let i = -r; i <= r; i++) s += kern[i + r] * tmp[Math.min(H - 1, Math.max(0, y + i)) * W + x];
      B[y * W + x] = s / ks;
    }
  // контраст: ширина перехода ~ 1/K от радиуса размытия
  const K = 2.6;
  const solid = (k) => A[k] >= 0.98;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const k = y * W + x;
      const a = Math.min(1, Math.max(0, (B[k] - 0.5 - inward) * K + 0.5));
      px[k * 4 + 3] = Math.round(a * 255);
      if (a === 0 || solid(k)) continue;
      // цвет кромки — средний цвет сплошных пикселей телефона рядом (окно 7×7, ближние весомее)
      let sr = 0, sg = 0, sb = 0, sw = 0;
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const j = yy * W + xx;
          if (!solid(j)) continue;
          const wgt = 1 / (dx * dx + dy * dy);
          sr += px[j * 4] * wgt;
          sg += px[j * 4 + 1] * wgt;
          sb += px[j * 4 + 2] * wgt;
          sw += wgt;
        }
      if (sw) [px[k * 4], px[k * 4 + 1], px[k * 4 + 2]] = [Math.round(sr / sw), Math.round(sg / sw), Math.round(sb / sw)];
    }
}

/**
 * Чистка альфы готовой вырезки (например, присланной вручную): почти прозрачная «дымка» вокруг телефона
 * (альфа < floor) становится полностью прозрачной, почти сплошной корпус (альфа ≥ solid) — сплошным.
 * Возвращает число убранных пикселей дымки.
 */
export function cleanAlpha(px, W, H, { floor = 40, solid = 240 } = {}) {
  let haze = 0;
  for (let k = 0; k < W * H; k++) {
    const i = k * 4 + 3;
    if (px[i] > 0 && px[i] < floor) {
      px[i] = 0;
      haze++;
    } else if (px[i] >= solid) px[i] = 255;
  }
  return haze;
}
