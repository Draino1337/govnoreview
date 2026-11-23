import type { Phone } from '../types.ts';
import type { Metrics } from './metrics.ts';
import { CATS, type Scores } from './score.ts';
import { chipset, fullName, monthYear, monthsApart, shortName } from './phones.ts';

export const fmtInt = (n: number) => Math.round(n).toLocaleString('ru-RU');
export const fmtHours = (h: number) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
const wifiName = (n: number) => `Wi-Fi ${Math.floor(n)}${n % 1 ? 'E' : ''}`;
/** разница без лишних знаков: 4, 2,5 */
const fmtNum = (n: number) => (Math.round(n * 10) / 10).toLocaleString('ru-RU');
const years = (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'год' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'года' : 'лет'}`;

interface NumRule {
  pick: (m: Metrics) => number | undefined;
  dir?: 'lo';
  min: number; // минимальная разница в процентах, чтобы это считалось отличием
  skip?: (a: Metrics, b: Metrics) => boolean;
  text: (d: { pct: number; abs: number; w: number; l: number }) => string;
}

const RULES: NumRule[] = [
  { pick: (m) => m.nits, min: 12, text: ({ pct }) => `На ${pct}% выше реальная яркость экрана` },
  { pick: (m) => m.antutu, min: 8, text: ({ pct }) => `На ${pct}% лучше результат в AnTuTu` },
  { pick: (m) => m.gbS, min: 5, text: ({ pct }) => `На ${pct}% быстрее в одноядерном Geekbench 6` },
  { pick: (m) => m.gbM, min: 5, text: ({ pct }) => `На ${pct}% быстрее в многоядерном Geekbench 6` },
  { pick: (m) => m.gpu, min: 10, text: ({ pct }) => `На ${pct}% мощнее графика в Geekbench Compute` },
  {
    pick: (m) => m.endurance,
    min: 8,
    skip: (a, b) => a.enduranceEst || b.enduranceEst,
    text: ({ pct }) => `На ${pct}% лучше автономность`,
  },
  { pick: (m) => m.bat, min: 8, text: ({ pct }) => `Аккумулятор ёмче на ${pct}%` },
  { pick: (m) => m.charge, min: 15, text: ({ abs }) => `Зарядка мощнее на ${fmtNum(abs)} Вт` },
  { pick: (m) => m.fullMin, dir: 'lo', min: 10, text: ({ abs }) => `Заряжается до 100% на ${abs} мин быстрее` },
  { pick: (m) => m.hz, min: 10, text: ({ abs }) => `Частота обновления экрана выше на ${fmtNum(abs)} Гц` },
  { pick: (m) => m.ppi, min: 8, text: ({ abs }) => `Плотность пикселей выше на ${fmtNum(abs)} ppi` },
  { pick: (m) => m.sensor, min: 10, text: ({ pct }) => `Сенсор основной камеры крупнее на ${pct}%` },
  { pick: (m) => m.mp, min: 30, text: ({ abs }) => `В основной камере на ${fmtNum(abs)} Мп больше` },
  { pick: (m) => m.frontMp, min: 20, text: ({ abs }) => `Селфи-камера детальнее на ${fmtNum(abs)} Мп` },
  { pick: (m) => m.ram, min: 20, text: ({ abs }) => `Оперативной памяти больше на ${fmtNum(abs)} ГБ` },
  { pick: (m) => m.updates, min: 20, text: ({ abs }) => `Обновления системы на ${years(Math.round(abs))} дольше` },
  { pick: (m) => m.weight, dir: 'lo', min: 4, text: ({ abs }) => `Весит на ${Math.round(abs)} г меньше` },
  { pick: (m) => m.thick, dir: 'lo', min: 6, text: ({ abs }) => `Тоньше на ${fmtNum(abs)} мм` },
  { pick: (m) => m.loud, min: 3, text: ({ abs }) => `Динамики громче на ${fmtNum(abs)} дБ` },
];

type Feat = (m: Metrics, o: Metrics) => string | null;
const FEATS: Feat[] = [
  (m, o) => (m.hasTele && !o.hasTele ? 'Есть телеобъектив для зума без потери качества' : null),
  (m, o) => (m.zoom > o.zoom && o.hasTele ? `Оптический зум больше на ${fmtNum(m.zoom - o.zoom)}x` : null),
  (m, o) => (m.fingerprint && !o.fingerprint ? 'Присутствует сканер отпечатков пальцев' : null),
  (m, o) => (m.wireless > 0 && o.wireless === 0 ? 'Поддерживает беспроводную зарядку' : null),
  (m, o) => (m.v8k && !o.v8k ? 'Умеет снимать видео в 8K' : null),
  (m, o) => ((m.v4k ?? 0) > (o.v4k ?? 0) && (m.v4k ?? 0) >= 60 ? `Видео 4K на ${m.v4k! - (o.v4k ?? 0)} кадров/с плавнее` : null),
  (m, o) => ((m.ip ?? 0) > (o.ip ?? 0) ? `Лучше защита от воды и пыли: IP${m.ip}` : null),
  (m, o) => ((m.wifi ?? 0) > (o.wifi ?? 0) ? `Поддерживает ${wifiName(m.wifi!)}` : null),
  (m, o) => ((m.bt ?? 0) > (o.bt ?? 0) ? `Поддерживает Bluetooth ${m.bt}` : null),
  (m, o) => (m.nm != null && o.nm != null && m.nm < o.nm ? `Техпроцесс тоньше на ${fmtNum(o.nm - m.nm)} нм` : null),
  (m, o) => (m.stereo && !o.stereo ? 'Стереодинамики' : null),
  (m, o) => (m.sdcard && !o.sdcard ? 'Есть слот для карты памяти' : null),
  (m, o) => (m.jack && !o.jack ? 'Есть разъём 3.5 мм' : null),
  (m, o) => (m.dolby && !o.dolby ? 'Поддержка Dolby Atmos' : null),
  (m, o) => (m.esim && !o.esim ? 'Поддерживает eSIM' : null),
  (m, o) => (m.hdr > o.hdr ? 'Лучше поддержка HDR' : null),
];

const MAX = 9;

export function keyDiffs(a: Metrics, b: Metrics): { a: string[]; b: string[] } {
  const out = { a: [] as string[], b: [] as string[] };
  for (const r of RULES) {
    const x = r.pick(a);
    const y = r.pick(b);
    if (x == null || y == null || x === y || r.skip?.(a, b)) continue;
    const aWins = r.dir === 'lo' ? x < y : x > y;
    const [w, l] = aWins ? [x, y] : [y, x];
    const abs = Math.abs(x - y);
    // процент считаем от «проигравшего» значения: 2808 против 1009 → +178%
    const pct = l > 0 ? Math.round((abs / l) * 100) : 0;
    if (pct < r.min) continue;
    out[aWins ? 'a' : 'b'].push(r.text({ pct, abs, w, l }));
  }
  for (const f of FEATS) {
    const ta = f(a, b);
    if (ta) out.a.push(ta);
    const tb = f(b, a);
    if (tb) out.b.push(tb);
  }
  return { a: out.a.slice(0, MAX), b: out.b.slice(0, MAX) };
}

const listRu = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} и ${xs[xs.length - 1]}`);

export function introText(a: Phone, b: Phone, ma: Metrics, mb: Metrics): string {
  const gap = monthsApart(a.released, b.released);
  const when =
    gap === 0
      ? 'Оба смартфона вышли в одном месяце.'
      : gap > 0
        ? `${shortName(b)} вышел на ${gap} мес. позже.`
        : `${shortName(a)} вышел на ${-gap} мес. позже.`;
  const chip = (p: Phone, m: Metrics) => `${m.diag ? `экран ${m.diag}″, ` : ''}чип ${chipset(p)}`;
  return `Сравниваем ${fullName(a)} (${monthYear(a.released)}; ${chip(a, ma)}) и ${fullName(b)} (${monthYear(b.released)}; ${chip(b, mb)}). ${when} Ниже — характеристики, замеры, сильные и слабые стороны каждого.`;
}

// NaN: если у одного из двух нет данных в категории, это не победа
export function verdictText(a: Phone, b: Phone, sa: Scores, sb: Scores): string {
  const wins = (x: Scores, y: Scores) => CATS.filter((c) => (x[c.id] ?? NaN) - (y[c.id] ?? NaN) >= 3).map((c) => c.title.toLowerCase());
  const wa = wins(sa, sb);
  const wb = wins(sb, sa);
  if (!wa.length && !wb.length) return `${shortName(a)} и ${shortName(b)} идут почти вровень во всех категориях — выбирайте по цене и дизайну.`;
  if (!wb.length) return `${fullName(a)} впереди практически по всем фронтам: ${listRu(wa.slice(0, 4))}. У ${shortName(b)} нет категории, где он заметно сильнее.`;
  if (!wa.length) return `${fullName(b)} впереди практически по всем фронтам: ${listRu(wb.slice(0, 4))}. У ${shortName(a)} нет категории, где он заметно сильнее.`;
  return `У обоих смартфонов есть сильные стороны. Если для вас важнее ${listRu(wa.slice(0, 3))} — берите ${fullName(a)}, а если ${listRu(wb.slice(0, 3))} — ${fullName(b)}.`;
}
