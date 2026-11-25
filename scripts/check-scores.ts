// Быстрая проверка: node scripts/check-scores.ts  — печатает метрики и оценки всех телефонов.
import fs from 'node:fs';
import { getMetrics } from '../src/lib/metrics.ts';
import { scoreAll, overall, valueIndex } from '../src/lib/score.ts';
import type { Phone } from '../src/types.ts';

const phones = JSON.parse(fs.readFileSync(new URL('../src/data/phones.json', import.meta.url), 'utf8')) as Phone[];
// --check: молча проверить, что все оценки целые 0..100 или undefined (нет данных), иначе exit 1. Запускается в npm run build.
if (process.argv.includes('--check')) {
  const ok = (x: number | undefined) => x === undefined || Number.isInteger(x) && x >= 0 && x <= 100;
  const bad = phones.flatMap((p) => {
    const m = getMetrics(p);
    const s = scoreAll(m);
    const ov = overall(s);
    const all = { ...s, overall: ov, value: valueIndex(ov, m.price) };
    return Object.entries(all).filter(([, v]) => !ok(v)).map(([k, v]) => `${p.id} ${k}=${v}`);
  });
  if (bad.length) { console.error('check-scores: плохие оценки:\n' + bad.join('\n')); process.exit(1); }
  console.log(`check-scores: ${phones.length} телефонов, ок`);
  process.exit(0);
}
console.log('id'.padEnd(30), 'disp cam perf game batt comm | итог | value');
for (const p of phones) {
  const m = getMetrics(p);
  const s = scoreAll(m);
  const ov = overall(s);
  console.log(
    p.id.padEnd(30),
    String(s.display).padStart(4), String(s.camera).padStart(3), String(s.perf).padStart(4), String(s.gaming).padStart(4), String(s.battery).padStart(4), String(s.comms).padStart(4),
    '|', String(ov).padStart(4), '|', valueIndex(ov, m.price),
  );
}
if (process.argv.includes('--m')) for (const p of phones) console.log(p.id, JSON.stringify(getMetrics(p)));
