// Быстрая проверка: node scripts/check-scores.ts  — печатает метрики и оценки всех телефонов.
import fs from 'node:fs';
import { getMetrics } from '../src/lib/metrics.ts';
import { scoreAll, overall, valueIndex } from '../src/lib/score.ts';
import type { Phone } from '../src/types.ts';

const phones = JSON.parse(fs.readFileSync(new URL('../src/data/phones.json', import.meta.url), 'utf8')) as Phone[];
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
