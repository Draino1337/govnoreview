import type { Metrics } from './metrics.ts';

export type CatId = 'display' | 'camera' | 'perf' | 'gaming' | 'battery' | 'comms';

export const CATS: { id: CatId; title: string; desc: string }[] = [
  { id: 'display', title: 'Дисплей', desc: 'Яркость, чёткость, плавность и HDR' },
  { id: 'camera', title: 'Камера', desc: 'Оценка камеры DxOMARK' },
  { id: 'perf', title: 'Производительность', desc: 'Скорость приложений и системы' },
  { id: 'gaming', title: 'Игры', desc: 'Графика и запас мощности в 3D' },
  { id: 'battery', title: 'Батарея', desc: 'Автономность и скорость зарядки' },
  { id: 'comms', title: 'Связь и звук', desc: 'Wi-Fi, Bluetooth, NFC и динамики' },
];

/** оценка категории 0..100; undefined — данных нет (у старых моделей нет бенчмарков) */
export type Scores = Record<CatId, number | undefined>;

/** вес каждой категории в итоговой оценке */
const WEIGHTS: Record<CatId, number> = { display: 20, camera: 20, perf: 15, gaming: 10, battery: 20, comms: 15 };

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
/** значение → 0..100 между lo и hi; undefined, если данных нет */
const lin = (v: number | undefined, lo: number, hi: number) => (v == null ? undefined : clamp((v - lo) / (hi - lo)) * 100);
const flag = (b: boolean, ifYes = 100, ifNo = 0) => (b ? ifYes : ifNo);

function wavg(parts: Array<[number | undefined, number]>): number | undefined {
  let s = 0;
  let w = 0;
  for (const [v, k] of parts) {
    if (v == null) continue;
    s += v * k;
    w += k;
  }
  return w ? s / w : undefined;
}

/** лёгкая «растяжка», чтобы шкала не слипалась у верхнего края */
const curve = (x: number | undefined, gamma = 0.85) => (x == null ? undefined : Math.round(100 * Math.pow(clamp(x / 100), gamma)));

/** оценка камеры по характеристикам, 0..100: сенсор, зум, широкоугольник, светосила, видео, фронталка */
export function cameraSpec(m: Metrics): number {
  return wavg([
    [lin(m.sensor, 0.3, 0.8), 3],
    [m.mp == null ? undefined : lin(Math.log(m.mp), Math.log(12), Math.log(200)), 0.7],
    [m.hasTele ? 55 + (lin(m.zoom, 0, 5) ?? 0) * 0.45 : 0, 3],
    [flag(m.hasUltra), 1.5],
    [m.aperture == null ? undefined : lin(2.2 - m.aperture, 0, 0.9), 1.5],
    [lin(m.v4k, 0, 120), 1],
    [flag(m.v8k), 0.5],
    [lin(m.frontMp, 8, 32), 0.7],
  ])!; // флаги зума и широкоугольника есть у каждого телефона, так что пустым не бывает
}

// Камера — по оценке DxOMARK (research/dxomark.tsv): DXO_LO…DXO_HI баллов → 0…100.
// Где DxOMARK телефон не тестировал, его оценку предсказываем по характеристикам и году выхода:
// 98.3 + 0.553 × cameraSpec + 2.85 × (год − 2020). Коэффициенты — наименьшие квадраты по 55 телефонам
// каталога с оценкой DxOMARK (ошибка ±8.6 балла); год нужен, потому что одни характеристики не отличают
// iPhone 2007 года от однокамерного 2022-го. При новых оценках в research/dxomark.tsv коэффициенты можно подобрать заново.
const DXO_LO = 40;
const DXO_HI = 175;
const cameraDxoEstimate = (m: Metrics) => 98.3 + 0.553 * cameraSpec(m) + 2.85 * (m.year - 2020);

export function scoreAll(m: Metrics): Scores {
  // реальный замер важнее, но заявленная пиковая яркость тоже учитывается
  const nits =
    m.nits != null && m.nitsClaimed != null ? m.nits * 0.7 + m.nitsClaimed * 0.3 : (m.nits ?? (m.nitsClaimed != null ? m.nitsClaimed * 0.8 : undefined));
  const display = wavg([
    [lin(nits, 400, 3200), 3],
    [lin(m.ppi, 250, 520), 2],
    [lin(m.hz, 60, 144), 2],
    [lin(m.srgb, 95, 100), 1],
    [m.hzMin == null ? undefined : m.hzMin <= 10 ? 100 : 55, 1],
    [m.hdr, 1],
    [lin(m.pwm, 120, 480), 1],
  ]);

  // скорость и игры судим по бенчмаркам: без них одна ОЗУ или 60 Гц дали бы ноль, а это не замер, а «нет данных»
  const perfBench = [m.antutu, m.gbS, m.gbM].some((v) => v != null);
  const gameBench = [m.gpu, m.flops, m.nomad, m.solar, m.antutu].some((v) => v != null);

  const perf = !perfBench ? undefined : wavg([
    [lin(m.antutu, 400000, 4800000), 4],
    [lin(m.gbS, 900, 4200), 3],
    [lin(m.gbM, 2500, 12000), 3],
    [lin(m.ram, 4, 16), 1],
    [lin(m.storageGen, 2, 4.1), 1],
  ]);

  const gaming = !gameBench ? undefined : wavg([
    [lin(m.gpu, 2500, 48000), 4],
    [lin(m.flops, 400, 4500), 3],
    [lin(m.nomad, 500, 2800), 2],
    [lin(m.solar, 5000, 13000), 2],
    [lin(m.hz, 60, 165), 1.5],
    [lin(m.antutu, 400000, 4800000), 1.5],
  ]);

  const battery = wavg([
    [lin(m.endurance, 10, 45), 6],
    [lin(m.bat, 3000, 9000), 1],
    [lin(m.charge, 15, 120), 2],
    [lin(m.wireless, 0, 50), 1],
    [m.fullMin == null ? undefined : lin(90 - m.fullMin, 0, 60), 1.5],
  ]);

  const comms = wavg([
    [lin(m.wifi, 5, 7), 3],
    [lin(m.bt, 5, 6), 2],
    [flag(m.nfc), 1.5],
    [flag(m.esim, 100, 40), 1],
    [flag(m.fiveG), 1.5],
    [flag(m.stereo, 100, 30), 1.5],
    [flag(m.dolby, 100, 50), 0.5],
    [lin(m.loud, 80, 92), 1],
  ]);

  return {
    display: curve(display),
    camera: Math.round(lin(m.dxo ?? cameraDxoEstimate(m), DXO_LO, DXO_HI) ?? 0),
    perf: curve(perf, 0.6),
    gaming: curve(gaming, 0.6),
    battery: curve(battery),
    comms: curve(comms),
  };
}

export function overall(s: Scores): number {
  let sum = 0;
  let w = 0;
  for (const c of CATS) {
    const v = s[c.id];
    if (v == null) continue; // нет данных — категория не тянет итог ни вверх, ни вниз
    sum += v * WEIGHTS[c.id];
    w += WEIGHTS[c.id];
  }
  return w ? Math.round(sum / w) : 0;
}

/** «цена/качество»: оценка в квадрате, делённая на цену (нормировано на $800) */
export function valueIndex(score: number, price: number): number {
  if (!(price > 0)) return 0;
  return Math.round(clamp(Math.pow(score / 100, 2) * Math.pow(800 / price, 0.75), 0, 1) * 100);
}

export const valueLabel = (v: number) => (v >= 80 ? 'Отличный' : v >= 60 ? 'Хороший' : v >= 40 ? 'Средний' : 'Слабый');

// самопроверка при разработке: категория без данных не тянет итог к нулю
if (import.meta.env?.DEV) // ?. — файл импортирует и Node (scripts/check-scores.ts), там env нет
  console.assert(overall({ display: 50, camera: 50, perf: undefined, gaming: undefined, battery: 50, comms: 50 }) === 50, 'overall учитывает пустые категории как 0');
