import type { Phone } from '../types.ts';

export const num = (s?: string): number | undefined => {
  if (!s) return undefined;
  const m = s.replace(',', '.').match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : undefined;
};

/** «10:12 ч.» → 10.2 */
export const hours = (s?: string): number | undefined => {
  const m = s?.match(/(\d+):(\d{2})/);
  return m ? +m[1] + +m[2] / 60 : undefined;
};

const yes = (s?: string) => !!s && /^Да/.test(s);

export interface Metrics {
  // экран
  diag?: number;
  ppi?: number;
  hz?: number;
  hzMin?: number;
  nits?: number; // реальные замеры
  nitsClaimed?: number;
  srgb?: number;
  pwm?: number;
  hdr: number;
  // корпус
  weight?: number;
  thick?: number;
  ip?: number;
  fingerprint: boolean;
  // производительность
  antutu?: number;
  gbS?: number;
  gbM?: number;
  gpu?: number;
  nomad?: number;
  solar?: number;
  flops?: number;
  cores?: number;
  ghz?: number;
  nm?: number;
  ram?: number;
  storage?: number;
  storageGen?: number;
  // батарея
  bat?: number;
  charge?: number;
  wireless: number;
  fullMin?: number;
  endurance?: number;
  enduranceEst: boolean;
  web?: number;
  video?: number;
  game?: number;
  // камера
  /** оценка камеры DxOMARK, если есть */
  dxo?: number;
  /** год выхода с долей месяца: 2024.75 — октябрь 2024 */
  year: number;
  mp?: number;
  sensor?: number;
  aperture?: number;
  hasTele: boolean;
  hasUltra: boolean;
  zoom: number;
  lenses: number;
  v4k?: number;
  v8k: boolean;
  frontMp?: number;
  // связь и звук
  wifi?: number;
  bt?: number;
  nfc: boolean;
  esim: boolean;
  fiveG: boolean;
  stereo: boolean;
  jack: boolean;
  dolby: boolean;
  sdcard: boolean;
  loud?: number;
  updates?: number;
  // общее
  price: number;
}

export function getMetrics(p: Phone): Metrics {
  const map = new Map<string, string>();
  for (const [s, u, l, v] of p.rows) map.set(`${s}|${u}|${l}`, v);
  const g = (s: string, u: string, l: string) => map.get(`${s}|${u}|${l}`);
  const bench = (t: string) => num(p.bench[t]);

  const adaptive = g('Экран', '', 'Адаптивная частота обновления');
  const hdr = g('Экран', '', 'Поддержка HDR') ?? '';
  const wifi = g('Коммуникации', '', 'Версия Wi-Fi')?.match(/Wi-Fi\s*(\d)(E)?/);
  const zoom = g('Основная камера', '', 'Зум')?.match(/Оптический[^\d]*([\d.]+)/);
  const lensList = (g('Основная камера', '', 'Количество объективов') ?? '').split(' · ').filter((x) => x && !/Depth|Macro/i.test(x));
  const storage = g('Память', 'Накопитель', 'Тип накопителя') ?? '';
  const bat = num(g('Батарея', '', 'Объем'));
  const wireless = g('Батарея', '', 'Беспроводная зарядка');
  const fullCharge = hours(g('Батарея', '', 'Время полной зарядки'));
  const measured = hours(p.bench['Общая автономность']);
  const speakers = g('Звук', '', 'Динамики') ?? '';

  return {
    diag: num(g('Экран', '', 'Размер')),
    ppi: num(g('Экран', '', 'Плотность пикселей')),
    hz: num(g('Экран', '', 'Частота обновления')),
    hzMin: adaptive?.match(/(\d+)-\d+/) ? +adaptive.match(/(\d+)-\d+/)![1] : yes(adaptive) ? 1 : undefined,
    nits: bench('Реальная пиковая яркость (авто)'),
    nitsClaimed: num(g('Экран', '', 'Макс. заявленная яркость')),
    srgb: num(g('Экран', 'Тестирование дисплея', 'Цветовой охват sRGB')),
    pwm: num(g('Экран', 'Тестирование дисплея', 'ШИМ (PWM)')),
    hdr: /Dolby/.test(hdr) ? 100 : /HDR10\+/.test(hdr) ? 90 : /HDR10/.test(hdr) ? 75 : yes(hdr) ? 70 : 0,

    weight: num(g('Дизайн и корпус', '', 'Вес')),
    thick: num(g('Дизайн и корпус', '', 'Толщина')),
    ip: num(g('Дизайн и корпус', '', 'Водонепроницаемость')?.replace('IP', '')),
    fingerprint: yes(g('Дизайн и корпус', '', 'Сканер отпечатков пальцев')),

    antutu: bench('AnTuTu Benchmark 11'),
    gbS: bench('Geekbench 6 (одноядерный)'),
    gbM: bench('Geekbench 6 (многоядерный)'),
    gpu: bench('Compute Score (GPU)'),
    nomad: bench('3DMark Steel Nomad Light'),
    solar: bench('3DMark Solar Bay'),
    flops: num(g('Производительность', 'GPU', 'FLOPS')),
    cores: num(g('Производительность', 'Процессор', 'CPU-ядер')),
    ghz: (num(g('Производительность', 'Процессор', 'Макс. частота')) ?? 0) / 1000 || undefined,
    nm: num(g('Производительность', 'Процессор', 'Размер транзистора')),
    ram: num(g('Память', 'Оперативная память', 'Объем ОЗУ')),
    storage: num(g('Память', 'Накопитель', 'Объем накопителя')),
    storageGen: /NVMe/.test(storage) ? 4 : num(storage.match(/UFS\s*([\d.]+)/)?.[1]),

    bat,
    charge: num(g('Батарея', '', 'Макс. мощность зарядки')),
    wireless: yes(wireless) ? (num(wireless) ?? 10) : 0,
    fullMin: fullCharge != null ? Math.round(fullCharge * 60) : undefined,
    // нет замера — оцениваем по ёмкости, помечая это флагом
    endurance: measured ?? (bat ? (bat / 5000) * 26 : undefined),
    enduranceEst: measured == null,
    web: hours(g('Батарея', 'Тесты автономности', 'Веб-серфинг')),
    video: hours(g('Батарея', 'Тесты автономности', 'Просмотр видео')),
    game: hours(g('Батарея', 'Тесты автономности', 'Игры')),

    mp: num(g('Основная камера', 'Основной объектив', 'Разрешение фото')),
    sensor: num(g('Основная камера', 'Основной объектив', 'Размер сенсора')?.match(/≈\s*([\d.]+)/)?.[1]),
    aperture: num(g('Основная камера', 'Основной объектив', 'Апертура')?.replace('f/', '')),
    hasTele: g('Основная камера', 'Телеобъектив', 'Разрешение фото') != null,
    hasUltra: g('Основная камера', 'Сверхширокоугольный объектив', 'Разрешение фото') != null,
    zoom: zoom ? parseFloat(zoom[1]) : 0,
    lenses: lensList.length,
    v4k: /Нет/.test(g('Основная камера', '', 'Запись 4K видео') ?? 'Нет') ? 0 : num(g('Основная камера', '', 'Запись 4K видео')),
    v8k: yes(g('Основная камера', '', 'Запись 8K видео')) || /До/.test(g('Основная камера', '', 'Запись 8K видео') ?? ''),
    frontMp: num(g('Фронтальная камера', '', 'Количество мегапикселей')),

    wifi: wifi ? +wifi[1] + (wifi[2] ? 0.5 : 0) : undefined,
    bt: num(g('Коммуникации', '', 'Версия Bluetooth')),
    nfc: yes(g('Коммуникации', '', 'NFC')),
    esim: yes(g('Коммуникации', 'Связь', 'Поддержка eSIM')),
    fiveG: yes(g('Коммуникации', 'Связь', 'Поддержка 5G')),
    stereo: /Стерео|2\.1/.test(speakers),
    jack: yes(g('Звук', '', '3.5 мм аудио порт')),
    dolby: yes(g('Звук', '', 'Dolby Atmos')),
    sdcard: yes(g('Память', 'Накопитель', 'Карта памяти')),
    loud: bench('Максимальная громкость'),
    updates: num(g('Программное обеспечение', '', 'Обновления OS')),

    dxo: p.dxo,
    year: +p.released.slice(0, 4) + (+p.released.slice(5, 7) - 1) / 12,
    price: p.price,
  };
}
