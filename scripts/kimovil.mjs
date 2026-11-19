// Вырезки телефонов из галерей Kimovil: research/parts/<id>-front.webp и <id>-back.webp.
//   node scripts/kimovil.mjs [id …]      (без аргументов — все телефоны из таблицы)
// Дальше кадр собирает scripts/combine.mjs.
//
// Номера кадров: p<n> — снимок «вид спереди» (phone_front), d<n> — кадр галереи (default); n — число из имени
// файла thumb_<n>_…_big.jpg на cdn-files.kimovil.com. Больше размера _big Kimovil не отдаёт.
// Исходники кэшируются в research/img-src/<id>/ (папка в .gitignore).
//
// Экран — всегда снимок спереди Kimovil. Спина — по возможности отдельный кадр спины того же цвета, что и
// обои на экране; тогда combine.mjs кладёт экран поверх спины (режим pure). Где у Kimovil нет отдельной спины,
// берём готовую композицию «спина + экран» с экраном сверху (режим keep).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'research', 'img-src');
const PARTS = path.join(root, 'research', 'parts');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

// back: кадр со спиной; opts — параметры scripts/cutout.mjs для обеих вырезок, frontOpts / backOpts — только для экрана / спины.
//   --blob=largest  в кадре рядом со спиной стоит профиль телефона, оставляем только спину
//   --crop + --mirror=right  спина лежит поверх экрана: режем по правой кромке спины, углы повторяем с левой
//   --mirror=bottom  под телефоном снят «отблеск пола»: срезаем его, нижние углы повторяем с верхних
//   --floor=60  под телефоном светлая тень пола: убираем светлые серые пиксели снизу, связанные с фоном
//   --round=R  снимок впритык к краям кадра: вместо вырезки фона — скруглённый прямоугольник с радиусом R
//   --alphamin=90  прозрачный исходник с нарисованной полупрозрачной тенью: тень убираем
//   --tol=N  допуск вырезки фона: меньше — для белых корпусов на белом фоне, больше — для светло-серого фона
// keep: кадр со спиной — это готовая композиция «спина + экран».
export const TABLE = {
  'samsung-galaxy-s26-ultra': { front: 'p1202118', back: 'd1202113' },
  'samsung-galaxy-s25-ultra': { front: 'p1035304', back: 'd1035322' },
  'samsung-galaxy-s25': { front: 'p1035258', back: 'd1035289' },
  'samsung-galaxy-s25-fe': { front: 'p1130207', back: 'd1132078' },
  'samsung-galaxy-a57-5g': { front: 'p1220378', back: 'd1220379', keep: true },
  'samsung-galaxy-a56-5g': { front: 'p1048638', back: 'd1052726' },
  'apple-iphone-18-pro-max': { front: 'p1287207', back: 'd1287132', backOpts: ['--blob=largest'] },
  'apple-iphone-17-pro-max': { front: 'p1133112', back: 'd1133108', backOpts: ['--blob=largest'] },
  'apple-iphone-17-pro': { front: 'p1133102', back: 'd1133092', backOpts: ['--blob=largest'] },
  'apple-iphone-17': { front: 'p1133088', back: 'd1133073', backOpts: ['--blob=largest'] },
  'apple-iphone-16-pro-max': { front: 'p975674', back: 'd975661', backOpts: ['--blob=largest'] },
  'apple-iphone-16': { front: 'p975708', back: 'd975712', backOpts: ['--blob=largest'] },
  'apple-iphone-15': { front: 'p820071', back: 'd820072', backOpts: ['--blob=largest'] },
  // iPhone 7 / 7 Plus: экран и спина вырезаны из одного кадра «экран + профиль + спина»; XS Max и XS — ровная
  // спина iPhone X (у XS дизайн спины тот же, а их собственные спины у Kimovil сняты под углом), SE (2022) — спина SE (2020) (тот же корпус и красный цвет)
  'apple-iphone-air': { front: 'p1133126', back: 'd1133124', backOpts: ['--blob=largest'] },
  'apple-iphone-xs-max': { front: 'p185129', back: 'd87962' },
  'apple-iphone-xs': { front: 'p185127', back: 'd87962' },
  'apple-iphone-x': { front: 'p87957', back: 'd87962' },
  'apple-iphone-se-2022': { front: 'p610658', back: 'd351842' },
  'apple-iphone-8-plus': { front: 'p88077', back: 'd88092' },
  // у iPhone 8 ровной спины нет ни на Kimovil, ни на GSMArena — по решению владельца спина SE (2020): тот же корпус,
  // но логотип по центру и без надписи «iPhone»
  'apple-iphone-8': { front: 'p87974', back: 'd351843' },
  'apple-iphone-7-plus': { front: 'd36668', back: 'd36668', frontOpts: ['--crop=55,112,295,575'], backOpts: ['--crop=452,112,295,575'] },
  // iPhone 2G, 3G и 3GS — не с Kimovil (там их нет), файлы положены в research/img-src вручную: gsm-* — GSMArena
  // (страницы снимков модели), wc-rear — спина 2G с Wikimedia Commons «Original iPhone rear.jpg», Robert Scoble, CC BY 2.0;
  // снят чуть в перспективе, wc-rear-flat — он же, выпрямленный построчно по левой и правой кромке
  'apple-iphone-3gs': { front: 'gsm-01', back: 'gsm-01', frontOpts: ['--crop=8,4,164,297'], backOpts: ['--crop=190,4,168,297'] },
  'apple-iphone-3g': { front: 'gsm-01', back: 'gsm-01', frontOpts: ['--crop=12,4,226,430'], backOpts: ['--crop=312,4,238,420'] },
  'apple-iphone-2g': { front: 'gsm-00', back: 'wc-rear-flat', frontOpts: ['--crop=18,0,246,500'], backOpts: ['--round=56'] },
  'apple-iphone-7': { front: 'd36652', back: 'd36652', frontOpts: ['--crop=50,105,300,590'], backOpts: ['--crop=452,105,300,590'] },
  'google-pixel-10-pro-xl': { front: 'p1120732', back: 'd1120739', opts: ['--mirror=bottom'] },
  'google-pixel-10': { front: 'p1120715', back: 'd1120705', opts: ['--mirror=bottom'] },
  // Google Pixel — от первого до последнего. Пометки к выбору кадров — в research/photo-sources.md.
  'google-pixel': { front: 'p39851', back: 'd40027', keep: true, opts: ['--floor=150,25'] },
  'google-pixel-xl': { front: 'p39854', back: 'd40033', backOpts: ['--crop=618,0,182,561', '--floor=90'] },
  'google-pixel-2': { front: 'p93287', back: 'd93407', backOpts: ['--tol=10'] },
  'google-pixel-2-xl': { front: 'p93317', back: 'd93406', frontOpts: ['--crop=0,2,290,598'], backOpts: ['--tol=6'] },
  'google-pixel-3': { front: 'p161509', back: 'd161518', keep: true, backOpts: ['--alphamin=90'] },
  'google-pixel-3-xl': { front: 'p161490', back: 'd161520', keep: true, backOpts: ['--alphamin=90'] },
  'google-pixel-3a': { front: 'p207251', back: 'd207248', keep: true },
  'google-pixel-3a-xl': { front: 'd207242', back: 'd207250', backOpts: ['--crop=640,0,260,554'] },
  'google-pixel-4': { front: 'p262010', back: 'd262025', keep: true },
  'google-pixel-4-xl': { front: 'p262010', back: 'd262022', keep: true },
  'google-pixel-4a': { front: 'p294762', back: 'd398840', keep: true },
  'google-pixel-4a-5g': { front: 'p421868', back: 'd421867', backOpts: ['--crop=546,0,344,683'] },
  'google-pixel-5': { front: 'p420538', back: 'd420544' },
  'google-pixel-6': { front: 'p562173', back: 'd562188' },
  'google-pixel-6-pro': { front: 'p556685', back: 'd562170', opts: ['--floor=60'] },
  'google-pixel-6a': { front: 'p576368', back: 'd633083', keep: true, opts: ['--floor=60'] },
  'google-pixel-7': { front: 'p684872', back: 'd684811', keep: true, opts: ['--floor=60'] },
  'google-pixel-7-pro': { front: 'p681678', back: 'd681679', keep: true, opts: ['--floor=60'] },
  'google-pixel-7a': { front: 'p772514', back: 'd768871', keep: true },
  'google-pixel-fold': { front: 'p772544', back: 'd772557', frontOpts: ['--tol=30', '--floor=60'] },
  'google-pixel-8': { front: 'p828658', back: 'd828656', keep: true, opts: ['--floor=60'] },
  'google-pixel-8-pro': { front: 'p828689', back: 'd828686', keep: true, opts: ['--floor=60'] },
  'google-pixel-8a': { front: 'p922249', back: 'd922243', keep: true, opts: ['--floor=60'] },
  'google-pixel-9': { front: 'p963003', back: 'd963746' },
  'google-pixel-9-pro': { front: 'p963762', back: 'd963776' },
  'google-pixel-9-pro-xl': { front: 'p963781', back: 'd963794' },
  'google-pixel-9-pro-fold': { front: 'p963037', back: 'd963803', frontOpts: ['--crop=1,1,284,595', '--round=44'] },
  'google-pixel-9a': { front: 'p1060002', back: 'd1060006', keep: true, opts: ['--floor=80,80'] },
  'google-pixel-10-pro': { front: 'p1120731', back: 'd1120717', keep: true, opts: ['--floor=60'] },
  'google-pixel-10-pro-fold': { front: 'p1119279', back: 'd1119278', keep: true, opts: ['--floor=60'] },
  'google-pixel-10a': { front: 'p1205591', back: 'd1205578', backOpts: ['--crop=100,0,314,718'] },
  'google-pixel-11': { front: 'p1275803', back: 'd1275804' },
  'google-pixel-11-pro': { front: 'p1275812', back: 'd1275813', backOpts: ['--crop=0,0,366,800', '--mirror=right'] },
  'google-pixel-11-pro-xl': { front: 'p1275822', back: 'd1275821', backOpts: ['--crop=0,0,376,800', '--mirror=right'] },
  'google-pixel-11-pro-fold': { front: 'p1275834', back: 'd1275829' },
  'xiaomi-17-pro-max': { front: 'p1139718', back: 'd1139713', keep: true },
  'xiaomi-17t-pro': { front: 'p1244241', back: 'd1244237' },
  'xiaomi-poco-x8-pro-max': { front: 'p1217581', back: 'd1217557' },
  'xiaomi-poco-f8-pro': { front: 'p1166693', back: 'd1166678', keep: true },
  'xiaomi-poco-f8-ultra': { front: 'p1166676', back: 'd1166667' },
  'xiaomi-poco-f9-ultra': { front: 'p1281503', back: 'd1281548' },
  'xiaomi-redmi-note-17-pro': { front: 'p1264556', back: 'd1264555', keep: true },
  'xiaomi-redmi-note-15-pro-5g': { front: 'p1170334', back: 'd1170320', keep: true },
  'oneplus-16': { front: 'p1300848', back: 'd1300845', keep: true },
  'oneplus-15': { front: 'p1149050', back: 'd1149027', keep: true },
  'vivo-x300-ultra': { front: 'p1223349', back: 'd1222302' },
  'oppo-find-x9-ultra': { front: 'p1223378', back: 'd1228191', backOpts: ['--crop=170,100,361,760', '--mirror=right'] },
  // флагманы 18.11.2026: Razr Ultra (2026) — только закрытый вид с внешним экраном (открытого у Kimovil нет)
  'samsung-galaxy-s26-plus': { front: 'p1202104', back: 'd1209524', backOpts: ['--crop=571,42,192,442'] },
  'samsung-galaxy-z-fold-8-ultra': { front: 'p1265021', back: 'd1267985' },
  'samsung-galaxy-z-fold-8': { front: 'p1265010', back: 'd1267962' },
  'samsung-galaxy-z-flip-8': { front: 'p1265002', back: 'd1264998' },
  'motorola-razr-ultra-2026': { front: 'p1237393', back: 'p1237393', keep: true },
  'xiaomi-18-pro-max': { front: 'p1293281', back: 'd1293275', keep: true },
  'xiaomi-18-pro': { front: 'p1293245', back: 'd1293248', keep: true },
  'xiaomi-17-ultra': { front: 'p1182505', back: 'd1182497', keep: true },
  'xiaomi-18-fold': { front: 'p1285619', back: 'd1285616', keep: true },
  'huawei-mate-90-pro-max': { front: 'p1295354', back: 'd1295353' },
  'huawei-mate-90-pro': { front: 'p1295378', back: 'd1295368' },
  'huawei-pura-90-pro-max': { front: 'p1231438', back: 'd1231432', keep: true },
  'huawei-mate-xt-2-ultimate': { front: 'p1286591', back: 'd1286581', keep: true },
  'honor-magic-9-pro-max': { front: 'p1294945', back: 'd1294937' },
  'honor-magic-v6': { front: 'p1210977', back: 'd1210966' },
  'oppo-find-x10-pro-max': { front: 'p1292165', back: 'd1292159', keep: true },
  'oppo-find-x9-pro': { front: 'p1148635', back: 'd1148634' },
  'oppo-find-n5': { front: 'p1043258', back: 'd1043241' },
  'vivo-x-fold6': { front: 'p1256597', back: 'd1256593', keep: true },
  'vivo-x500-pro-max': { front: 'p1291706', back: 'd1291695' },
  'vivo-x500-pro': { front: 'p1291738', back: 'd1291735' },
  'vivo-iqoo-16': { front: 'p1294958', back: 'd1294952' },
  'realme-gt-8-pro': { front: 'p1151295', back: 'd1151307' },
  'oneplus-15t': { front: 'p1218946', back: 'd1218953', keep: true },
  'oneplus-13': { front: 'p995009', back: 'd997847' },
  'sony-xperia-1-viii': { front: 'p1239920', back: 'd1239915', backOpts: ['--crop=506,68,257,540'] },
  'asus-zenfone-12-ultra': { front: 'p1041746', back: 'd1041755', keep: true },
  'asus-rog-phone-9-pro': { front: 'p1006234', back: 'd1006230', keep: true },
  'zte-nubia-red-magic-12-pro-plus': { front: 'p1300872', back: 'd1300862', keep: true, backOpts: ['--crop=0,0,362,418'] },
  'zte-nubia-z80-ultra': { front: 'p1148992', back: 'd1148643', keep: true },
  'nothing-phone-3': { front: 'p1104510', back: 'd1104503' },
  'huawei-p30-pro': { front: 'p197642', back: 'd198720' },
  'huawei-p40': { front: 'p342208', back: 'd342363' },
  'huawei-p40-lite': { front: 'p284356', back: 'd284367' },
  'huawei-p40-pro': { front: 'p342231', back: 'd342321' },
  'huawei-p50-pro': { front: 'p532248', back: 'd532235' },
  'huawei-p60': { front: 'p753046', back: 'd753081' },
  'huawei-p60-pro': { front: 'p753115', back: 'd753063' },
  'huawei-pura-70': { front: 'p914250', back: 'd914258' },
  'huawei-pura-70-pro': { front: 'p914335', back: 'd914318' },
  'huawei-pura-70-ultra': { front: 'p914375', back: 'd914356' },
  'huawei-pura-80': { front: 'p1096098', back: 'd1096095', keep: true },
  'huawei-pura-80-pro': { front: 'p1096109', back: 'd1096147' },
  'huawei-pura-80-pro-plus': { front: 'p1096180', back: 'd1096158' },
  'huawei-pura-80-ultra': { front: 'p1096201', back: 'd1096186' },
  'huawei-pura-90': { front: 'p1231412', back: 'd1231406' },
  'huawei-pura-90-plus': { front: 'p1305669', back: 'd1305661', keep: true },
  'huawei-pura-90-pro': { front: 'p1231424', back: 'd1231415' },
  'huawei-pura-90s-pro': { front: 'p1231424', back: 'd1231420' },
  'huawei-pura-90s-pro-max': { front: 'p1231438', back: 'd1231436', keep: true },
  'huawei-pura-x-max': { front: 'p1231463', back: 'd1231470', keep: true },
  'huawei-pura-x-view': { front: 'p1279948', back: 'd1279961' },
  'nothing-cmf-phone-1': { front: 'p948310', back: 'd948301' },
  'nothing-cmf-phone-2-pro': { front: 'p1077412', back: 'd1077417' },
  'nothing-phone-1': { front: 'p654289', back: 'd653553', keep: true },
  'nothing-phone-2': { front: 'p795800', back: 'd795791' },
  'nothing-phone-2a': { front: 'p894607', back: 'd894864' },
  'nothing-phone-2a-plus': { front: 'p960112', back: 'd960126' },
  'nothing-phone-3a': { front: 'p1050559', back: 'd1053312' },
  'nothing-phone-3a-lite': { front: 'p1154498', back: 'd1154500', backOpts: ['--crop=53,38,670,1414', '--round=72'] },
  'nothing-phone-3a-pro': { front: 'p1053301', back: 'd1053290' },
  'nothing-phone-4a': { front: 'p1212231', back: 'd1212230' },
  'nothing-phone-4a-pro': { front: 'p1212231', back: 'd1212235' },
  'nothing-phone-4b': { front: 'p1261874', back: 'd1261880', backOpts: ['--crop=174,32,518,1097', '--round=62'] },
};

const url = (ref) => {
  const n = +ref.slice(1);
  const dir = `${String(Math.floor(n / 100000) + 1).padStart(4, '0')}/${String(Math.floor((n % 100000) / 1000) + 1).padStart(2, '0')}`;
  return ref[0] === 'p'
    ? `https://cdn-files.kimovil.com/phone_front/${dir}/thumb_${n}_phone_front_big.jpg`
    : `https://cdn-files.kimovil.com/default/${dir}/thumb_${n}_default_big.jpg`;
};

async function source(id, ref) {
  const file = path.join(SRC, id, `${ref}.jpg`);
  if (fs.existsSync(file)) return file;
  // fetch() из Node CDN Kimovil иногда отвечает 403, curl с «браузерным» User-Agent проходит
  fs.mkdirSync(path.dirname(file), { recursive: true });
  for (const u of [url(ref), url(ref).replace(/.jpg$/, '.jpeg')])
    try {
      execFileSync('curl', ['-s', '-f', '-A', UA, '-e', 'https://www.kimovil.com/', '-o', file, u]);
      return file;
    } catch {}
  throw new Error(`${id}: не скачался ${ref}`);
}

const cutout = (input, output, opts = []) =>
  process.stdout.write(execFileSync('node', [path.join(root, 'scripts', 'cutout.mjs'), input, output, '--upscale=640', '--erode=0', ...(opts ?? [])]));

const main = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const ids = main ? process.argv.slice(2) : [];
for (const id of !main ? [] : ids.length ? ids : Object.keys(TABLE)) {
  const t = TABLE[id];
  if (!t) throw new Error(`нет в таблице: ${id}`);
  cutout(await source(id, t.front), path.join(PARTS, `${id}-front.webp`), [...(t.opts ?? []), ...(t.frontOpts ?? [])]);
  if (t.back) cutout(await source(id, t.back), path.join(PARTS, `${id}-back.webp`), [...(t.opts ?? []), ...(t.backOpts ?? [])]);
}
