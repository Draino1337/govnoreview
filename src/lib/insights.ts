import type { Phone } from '../types.ts';
import type { Metrics } from './metrics.ts';
import { CATS, type Scores } from './score.ts';
import { chipset, fullName, monthYear, monthsApart, shortName } from './phones.ts';

export const fmtInt = (n: number) => Math.round(n).toLocaleString('ru-RU');
export const fmtHours = (h: number) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
const wifiName = (n: number) => `Wi-Fi ${Math.floor(n)}${n % 1 ? 'E' : ''}`;

interface NumRule {
  pick: (m: Metrics) => number | undefined;
  dir?: 'lo';
  min: number; // минимальная разница в процентах, чтобы это считалось отличием
  skip?: (a: Metrics, b: Metrics) => boolean;
  text: (d: { pct: number; abs: number; w: number; l: number }) => string;
}

const RULES: NumRule[] = [
  { pick: (m) => m.nits, min: 12, text: ({ pct, w, l }) => `На ${pct}% выше реальная яркость экрана (${fmtInt(w)} против ${fmtInt(l)} нит)` },
  { pick: (m) => m.antutu, min: 8, text: ({ pct, w, l }) => `На ${pct}% лучше результат в AnTuTu (${fmtInt(w)} против ${fmtInt(l)})` },
  { pick: (m) => m.gbS, min: 5, text: ({ pct, w, l }) => `На ${pct}% быстрее в одноядерном Geekbench 6 (${fmtInt(w)} против ${fmtInt(l)})` },
  { pick: (m) => m.gbM, min: 5, text: ({ pct, w, l }) => `На ${pct}% быстрее в многоядерном Geekbench 6 (${fmtInt(w)} против ${fmtInt(l)})` },
  { pick: (m) => m.gpu, min: 10, text: ({ pct, w, l }) => `На ${pct}% мощнее графика в Geekbench Compute (${fmtInt(w)} против ${fmtInt(l)})` },
  {
    pick: (m) => m.endurance,
    min: 8,
    skip: (a, b) => a.enduranceEst || b.enduranceEst,
    text: ({ pct, w, l }) => `На ${pct}% лучше автономность (${fmtHours(w)} против ${fmtHours(l)} ч.)`,
  },
  { pick: (m) => m.bat, min: 8, text: ({ pct, w, l }) => `Аккумулятор ёмче на ${pct}% (${fmtInt(w)} против ${fmtInt(l)} мАч)` },
  { pick: (m) => m.charge, min: 15, text: ({ w, l }) => `Поддерживает более мощную зарядку (${w}W vs ${l}W)` },
  { pick: (m) => m.fullMin, dir: 'lo', min: 10, text: ({ abs }) => `Заряжается до 100% на ${abs} мин быстрее` },
  { pick: (m) => m.hz, min: 10, text: ({ w, l }) => `Выше частота обновления экрана (${w} против ${l} Гц)` },
  { pick: (m) => m.ppi, min: 8, text: ({ w, l }) => `Выше плотность пикселей (${w} против ${l} ppi)` },
  { pick: (m) => m.sensor, min: 10, text: ({ w, l }) => `Крупнее сенсор основной камеры (${w}″ против ${l}″)` },
  { pick: (m) => m.mp, min: 30, text: ({ w, l }) => `Больше мегапикселей в основной камере (${w} против ${l} Мп)` },
  { pick: (m) => m.frontMp, min: 20, text: ({ w, l }) => `Селфи-камера детальнее (${w} против ${l} Мп)` },
  { pick: (m) => m.ram, min: 20, text: ({ w, l }) => `Больше оперативной памяти (${w} против ${l} ГБ)` },
  { pick: (m) => m.updates, min: 20, text: ({ w, l }) => `Дольше обновления системы (${w} против ${l} лет)` },
  { pick: (m) => m.weight, dir: 'lo', min: 4, text: ({ abs }) => `Весит на ${Math.round(abs)} г меньше` },
  { pick: (m) => m.thick, dir: 'lo', min: 6, text: ({ abs }) => `Тоньше на ${abs.toFixed(1)} мм` },
  { pick: (m) => m.loud, min: 3, text: ({ pct, w, l }) => `Громче динамики на ${pct}% (${w} против ${l} дБ)` },
];

type Feat = (m: Metrics, o: Metrics) => string | null;
const FEATS: Feat[] = [
  (m, o) => (m.hasTele && !o.hasTele ? 'Есть телеобъектив для зума без потери качества' : null),
  (m, o) => (m.zoom > o.zoom && o.hasTele ? `Оптический зум ${m.zoom}x (у соперника ${o.zoom}x)` : null),
  (m, o) => (m.fingerprint && !o.fingerprint ? 'Присутствует сканер отпечатков пальцев' : null),
  (m, o) => (m.wireless > 0 && o.wireless === 0 ? 'Поддерживает беспроводную зарядку' : null),
  (m, o) => (m.v8k && !o.v8k ? 'Умеет снимать видео в 8K' : null),
  (m, o) => ((m.v4k ?? 0) > (o.v4k ?? 0) && (m.v4k ?? 0) >= 60 ? `Видео 4K до ${m.v4k} кадров/с (у соперника ${o.v4k ?? 0})` : null),
  (m, o) => ((m.ip ?? 0) > (o.ip ?? 0) ? `Лучше защита от воды и пыли (IP${m.ip} против IP${o.ip})` : null),
  (m, o) => ((m.wifi ?? 0) > (o.wifi ?? 0) ? `Новее Wi-Fi (${wifiName(m.wifi!)} против ${o.wifi ? wifiName(o.wifi) : 'старого'})` : null),
  (m, o) => ((m.bt ?? 0) > (o.bt ?? 0) ? `Новее Bluetooth (${m.bt} против ${o.bt})` : null),
  (m, o) => (m.nm != null && o.nm != null && m.nm < o.nm ? `Современнее техпроцесс (${m.nm} нм против ${o.nm} нм)` : null),
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

export function verdictText(a: Phone, b: Phone, sa: Scores, sb: Scores): string {
  const wins = (x: Scores, y: Scores) => CATS.filter((c) => x[c.id] - y[c.id] >= 3).map((c) => c.title.toLowerCase());
  const wa = wins(sa, sb);
  const wb = wins(sb, sa);
  if (!wa.length && !wb.length) return `${shortName(a)} и ${shortName(b)} идут почти вровень во всех категориях — выбирайте по цене и дизайну.`;
  if (!wb.length) return `${fullName(a)} впереди практически по всем фронтам: ${listRu(wa.slice(0, 4))}. У ${shortName(b)} нет категории, где он заметно сильнее.`;
  if (!wa.length) return `${fullName(b)} впереди практически по всем фронтам: ${listRu(wb.slice(0, 4))}. У ${shortName(a)} нет категории, где он заметно сильнее.`;
  return `У обоих смартфонов есть сильные стороны. Если для вас важнее ${listRu(wa.slice(0, 3))} — берите ${fullName(a)}, а если ${listRu(wb.slice(0, 3))} — ${fullName(b)}.`;
}
