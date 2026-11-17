// Контактный лист для выбора кадров: node scripts/make-sheet.mjs <out.png> <колонок> <ширина ячейки> <высота ячейки> <img> <img> ...
// Картинки кладутся на шахматный фон (видно прозрачность), номер кадра — в левом верхнем углу (по порядку аргументов, с 1).
import sharp from 'sharp';

const [out, colsArg, wArg, hArg, ...files] = process.argv.slice(2);
const cols = +colsArg;
const cw = +wArg;
const ch = +hArg;
const rows = Math.ceil(files.length / cols);

// шахматка 12×12
const checker = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}"><defs><pattern id="p" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#3a3d4a"/><rect width="12" height="12" fill="#2c2f3a"/><rect x="12" y="12" width="12" height="12" fill="#2c2f3a"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>`,
);

// цифры 3×5 пикселей — без зависимости от системных шрифтов
const FONT = {
  0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001',
  5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111',
};
const label = (n) => {
  const s = String(n);
  const k = 4;
  let rects = '';
  [...s].forEach((d, i) => {
    FONT[d].split('').forEach((v, j) => {
      if (v === '1') rects += `<rect x="${6 + i * 4 * k + (j % 3) * k}" y="${6 + Math.floor(j / 3) * k}" width="${k}" height="${k}" fill="#ffd60a"/>`;
    });
  });
  const w = 12 + s.length * 4 * k;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${6 * k + 12}"><rect width="100%" height="100%" rx="4" fill="#000" fill-opacity=".75"/>${rects}</svg>`);
};

const layers = [];
for (let i = 0; i < files.length; i++) {
  const left = (i % cols) * cw;
  const top = Math.floor(i / cols) * ch;
  layers.push({ input: checker, left, top });
  try {
    const img = await sharp(files[i]).resize(cw - 8, ch - 8, { fit: 'inside' }).toBuffer();
    const m = await sharp(img).metadata();
    layers.push({ input: img, left: left + 4 + Math.round((cw - 8 - m.width) / 2), top: top + 4 + Math.round((ch - 8 - m.height) / 2) });
  } catch (e) {
    console.error('skip', i + 1, files[i], e.message);
  }
  layers.push({ input: label(i + 1), left: left + 4, top: top + 4 });
}

await sharp({ create: { width: cols * cw, height: rows * ch, channels: 3, background: '#1b1d27' } })
  .composite(layers)
  .png()
  .toFile(out);
console.log('sheet', out, `${cols * cw}x${rows * ch}`, files.length, 'images');
