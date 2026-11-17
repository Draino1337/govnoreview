import type { Phone, Row } from '../types.ts';
import { hours, num } from './metrics.ts';

export const SECTION_ORDER = [
  'Экран',
  'Дизайн и корпус',
  'Производительность',
  'Память',
  'Программное обеспечение',
  'Батарея',
  'Основная камера',
  'Фронтальная камера',
  'Коммуникации',
  'Звук',
  'Другое',
];

export const SECTION_INFO: Record<string, { desc: string; icon: string }> = {
  Экран: { desc: 'Тип матрицы, яркость и защита', icon: 'display' },
  'Дизайн и корпус': { desc: 'Размеры, вес и материалы', icon: 'body' },
  Производительность: { desc: 'Процессор и графика', icon: 'chip' },
  Память: { desc: 'Оперативная и встроенная память', icon: 'memory' },
  'Программное обеспечение': { desc: 'Система и срок обновлений', icon: 'code' },
  Батарея: { desc: 'Ёмкость, зарядка и замеры автономности', icon: 'battery' },
  'Основная камера': { desc: 'Модули, оптика и видео', icon: 'camera' },
  'Фронтальная камера': { desc: 'Камера для селфи', icon: 'selfie' },
  Коммуникации: { desc: 'Беспроводные интерфейсы и SIM', icon: 'wifi' },
  Звук: { desc: 'Динамики и разъёмы', icon: 'sound' },
  Другое: { desc: 'Класс, цена и комплектация', icon: 'tag' },
};

// замеры из блока «bench» показываем и в таблице характеристик
const BENCH_ROWS: [bench: string, sec: string, sub: string, label: string][] = [
  ['Реальная пиковая яркость (авто)', 'Экран', 'Тестирование дисплея', 'Реальная пиковая яркость'],
  ['Соотношение экрана к корпусу', 'Дизайн и корпус', '', 'Соотношение экрана к корпусу'],
  ['Общая автономность', 'Батарея', 'Тесты автономности', 'Общая автономность'],
  ['Максимальная громкость', 'Звук', 'Тесты динамиков', 'Максимальная громкость'],
];

const allRows = (p: Phone): Row[] => [
  ...p.rows,
  ...BENCH_ROWS.filter(([t]) => p.bench[t]).map(([t, s, u, l]): Row => [s, u, l, p.bench[t]]),
];

const HI = new Set([
  'Плотность пикселей', 'Частота обновления', 'Макс. заявленная яркость', 'Реальная пиковая яркость', 'Цветовой охват sRGB', 'ШИМ (PWM)',
  'Объем ОЗУ', 'Объем накопителя', 'Объем', 'Макс. мощность зарядки', 'Обновления OS', 'Макс. частота', 'CPU-ядер', 'FLOPS',
  'Максимальная громкость', 'Соотношение экрана к корпусу', 'Количество мегапикселей', 'Матрица', 'Разрешение фото', 'Версия Bluetooth',
]);
const YES_NO = new Set([
  'Сканер отпечатков пальцев', 'Карта памяти', 'Поддержка eSIM', 'Поддержка 5G', 'NFC', 'Dolby Atmos', '3.5 мм аудио порт', 'Зарядное устройство из коробки',
]);
const CLOCK = new Set(['Веб-серфинг', 'Просмотр видео', 'Игры', 'Общая автономность']);

/** Больше — лучше. undefined — строка не участвует в выборе победителя. */
function rank(label: string, v?: string): number | undefined {
  if (v == null) return undefined;
  switch (label) {
    case 'Разрешение': {
      const m = v.match(/(\d+)\s*x\s*(\d+)/);
      return m ? +m[1] * +m[2] : undefined;
    }
    case 'Апертура': {
      const n = num(v.replace('f/', ''));
      return n == null ? undefined : -n;
    }
    case 'Размер сенсора':
      return num(v.match(/≈\s*([\d.]+)/)?.[1]);
    case 'Водонепроницаемость':
      return num(v.replace('IP', ''));
    case 'Версия Wi-Fi': {
      const m = v.match(/Wi-Fi\s*(\d)(E)?/);
      return m ? +m[1] + (m[2] ? 0.5 : 0) : undefined;
    }
    case 'Тип накопителя':
      return /NVMe/.test(v) ? 4 : num(v.match(/UFS\s*([\d.]+)/)?.[1]);
    case 'Тип памяти': {
      const m = v.match(/LPDDR(\d)(X?)/);
      return m ? +m[1] + (m[2] ? 0.5 : 0) : undefined;
    }
    case 'Зум':
      return v.match(/Оптический[^\d]*([\d.]+)/) ? parseFloat(v.match(/Оптический[^\d]*([\d.]+)/)![1]) : 0;
    case 'Запись 8K видео':
    case 'Запись 4K видео':
      return /Нет/.test(v) ? 0 : num(v);
    case 'Беспроводная зарядка':
      return /^Да/.test(v) ? (num(v) ?? 1) : 0;
    case 'Время полной зарядки': {
      const h = hours(v);
      return h == null ? undefined : -h;
    }
    case 'Вес':
    case 'Толщина':
    case 'Размер транзистора': {
      const n = num(v);
      return n == null ? undefined : -n;
    }
  }
  if (YES_NO.has(label)) return /^Да/.test(v) ? 1 : 0;
  if (CLOCK.has(label)) return hours(v);
  return HI.has(label) ? num(v) : undefined;
}

export interface SpecRow {
  label: string;
  a?: string;
  b?: string;
  win: 'a' | 'b' | null;
  same: boolean;
}
export interface SpecGroup {
  caption: string;
  rows: SpecRow[];
}
export interface SpecSection {
  title: string;
  desc: string;
  icon: string;
  groups: SpecGroup[];
}

const keyOf = (r: Row) => `${r[0]}|${r[1]}|${r[2]}`;

export function buildSpecs(a: Phone, b: Phone): SpecSection[] {
  const ra = allRows(a);
  const rb = allRows(b);
  const va = new Map(ra.map((r) => [keyOf(r), r[3]]));
  const vb = new Map(rb.map((r) => [keyOf(r), r[3]]));

  // объединяем порядок строк: сначала A, строки только у B вставляем после предыдущей строки B
  const keys = ra.map(keyOf);
  let at = -1;
  for (const r of rb) {
    const i = keys.indexOf(keyOf(r));
    if (i >= 0) {
      at = i;
      continue;
    }
    keys.splice(at + 1, 0, keyOf(r));
    at += 1;
  }

  const secs = new Map<string, Map<string, SpecRow[]>>();
  for (const k of keys) {
    const [sec, sub, label] = k.split('|');
    const x = va.get(k);
    const y = vb.get(k);
    const rx = rank(label, x);
    const ry = rank(label, y);
    const row: SpecRow = {
      label,
      a: x,
      b: y,
      win: rx != null && ry != null && rx !== ry ? (rx > ry ? 'a' : 'b') : null,
      same: (x ?? '') === (y ?? ''),
    };
    if (!secs.has(sec)) secs.set(sec, new Map());
    const groups = secs.get(sec)!;
    if (!groups.has(sub)) groups.set(sub, []);
    groups.get(sub)!.push(row);
  }

  const order = [...SECTION_ORDER, ...[...secs.keys()].filter((s) => !SECTION_ORDER.includes(s))];
  return order
    .filter((s) => secs.has(s))
    .map((title) => ({
      title,
      desc: SECTION_INFO[title]?.desc ?? '',
      icon: SECTION_INFO[title]?.icon ?? 'tag',
      groups: [...secs.get(title)!.entries()].map(([caption, rows]) => ({ caption, rows })),
    }));
}

export const BENCH_GROUPS: { title: string; icon: string; items: [key: string, label: string][] }[] = [
  {
    title: 'Процессор',
    icon: 'chip',
    items: [
      ['Geekbench 6 (одноядерный)', 'Geekbench 6 · одно ядро'],
      ['Geekbench 6 (многоядерный)', 'Geekbench 6 · все ядра'],
      ['AnTuTu Benchmark 11', 'AnTuTu 11'],
      ['PCMark 3.0', 'PCMark Work 3.0'],
    ],
  },
  {
    title: 'Графика',
    icon: 'game',
    items: [
      ['Compute Score (GPU)', 'Geekbench 6 Compute (GPU)'],
      ['3DMark Steel Nomad Light', '3DMark Steel Nomad Light'],
      ['3DMark Solar Bay', '3DMark Solar Bay'],
      ['3DMark Wild Life Extreme', '3DMark Wild Life Extreme'],
    ],
  },
];
