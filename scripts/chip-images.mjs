// Скачивает картинки чипов из research/chips.tsv в public/chips/<slug>.webp (96×96). Уже скачанные пропускает.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { chipSlug as slug } from '../src/lib/chip.ts';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'public', 'chips');
console.assert(slug('HiSilicon Kirin 9010S') === 'hisilicon-kirin-9010s' && slug('Apple A10 Fusion') === 'apple-a10-fusion');

fs.mkdirSync(out, { recursive: true });
const lines = fs.readFileSync(path.join(root, 'research', 'chips.tsv'), 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('#'));
for (const [chip, url] of lines.map((l) => l.split('|'))) {
  const file = path.join(out, slug(chip) + '.webp');
  if (fs.existsSync(file)) continue;
  const res = await fetch(url, { headers: { 'User-Agent': 'govnoreview-build/1.0' } });
  if (!res.ok) { console.warn(`  ${chip}: ${res.status} ${url}`); continue; }
  await sharp(Buffer.from(await res.arrayBuffer())).resize(96, 96, { fit: 'cover' }).webp({ quality: 85 }).toFile(file);
  console.log(`  ${chip} → chips/${path.basename(file)}`);
}
