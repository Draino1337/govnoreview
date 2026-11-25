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
  'samsung-galaxy-s10': { front: 'p191056', back: 'd191080' },
  'samsung-galaxy-s10-plus': { front: 'p191132', back: 'd191090' },
  'samsung-galaxy-s10e': { front: 'p191167', back: 'd191142' },
  'samsung-galaxy-s20': { front: 'p322700', back: 'd322983' },
  'samsung-galaxy-s20-fe': { front: 'p419932', back: 'd419877' },
  'samsung-galaxy-s20-plus': { front: 'p322746', back: 'd322970' },
  'samsung-galaxy-s20-ultra': { front: 'p322834', back: 'd302649', keep: true },
  'samsung-galaxy-s21': { front: 'p451887', back: 'd462438', keep: true },
  'samsung-galaxy-s21-fe-5g': { front: 'p586644', back: 'd586649' },
  'samsung-galaxy-s21-plus': { front: 'p452032', back: 'd462431', keep: true },
  'samsung-galaxy-s21-ultra': { front: 'p452021', back: 'd462858' },
  'samsung-galaxy-s22': { front: 'p598220', back: 'd598221', keep: true },
  'samsung-galaxy-s22-plus': { front: 'p598213', back: 'd598215', keep: true },
  'samsung-galaxy-s22-ultra': { front: 'p598206', back: 'd601045', keep: true },
  'samsung-galaxy-s23': { front: 'p732927', back: 'd732932', keep: true },
  // gsm-Nc (S23 FE, Z Fold 3, 4, 6) — снимки GSMArena, положены вручную, надпись на корпусе затёрта; см. research/photo-sources.md
  'samsung-galaxy-s23-fe-exynos': { front: 'p821206', back: 'gsm-1c', backOpts: ['--crop=356,0,304,611'] },
  'samsung-galaxy-s23-plus': { front: 'p732861', back: 'd732944', keep: true },
  'samsung-galaxy-s23-ultra': { front: 'p732956', back: 'd732948', keep: true },
  'samsung-galaxy-s24-exynos': { front: 'p861486', back: 'd861485', keep: true },
  'samsung-galaxy-s24-fe': { front: 'p982692', back: 'd982696', keep: true, backOpts: ['--blob=largest'] },
  'samsung-galaxy-s24-plus-exynos': { front: 'p863692', back: 'd863691', keep: true },
  'samsung-galaxy-s24-ultra': { front: 'p861490', back: 'd861493', keep: true },
  'samsung-galaxy-s25-edge': { front: 'p1083543', back: 'd1083552' },
  'samsung-galaxy-s25-plus': { front: 'p1035250', back: 'd1035219' },
  'samsung-galaxy-s26-exynos': { front: 'p1202104', back: 'd1209520', backOpts: ['--crop=570,40,230,460'] },
  'samsung-galaxy-z-flip-3-5g': { front: 'p536983', back: 'd536988', backOpts: ['--crop=400,0,320,720'] },
  'samsung-galaxy-z-flip-4': { front: 'p664127', back: 'd664134' },
  'samsung-galaxy-z-flip-5': { front: 'p796742', back: 'd796746', keep: true, backOpts: ['--tol=6'] },
  'samsung-galaxy-z-flip-6': { front: 'p946790', back: 'd946794' },
  'samsung-galaxy-z-flip-7': { front: 'p1107551', back: 'd1107898' },
  'samsung-galaxy-z-flip-7-fe': { front: 'p1107566', back: 'd1107914' },
  'samsung-galaxy-z-fold-3-5g': { front: 'p536872', back: 'gsm-1c', keep: true, backOpts: ['--crop=0,0,355,456'] },
  'samsung-galaxy-z-fold-4': { front: 'p663367', back: 'gsm-2c', keep: true },
  'samsung-galaxy-z-fold-5': { front: 'p796976', back: 'd796973', keep: true },
  'samsung-galaxy-z-fold-6': { front: 'p946759', back: 'gsm-2c', keep: true },
  'samsung-galaxy-z-fold-7': { front: 'p1107538', back: 'd1107871', keep: true },
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
  // Asus, Fairphone, Honor — кадры Kimovil, временные до присланных владельцем
  'asus-rog-phone-5': { front: 'p480592', back: 'd480610' },
  'asus-rog-phone-6d': { front: 'p679450', back: 'd679451' },
  'asus-rog-phone-7': { front: 'p760816', back: 'd760817' },
  'asus-rog-phone-7-ultimate': { front: 'p760855', back: 'd760865' },
  'asus-rog-phone-8': { front: 'p870506', back: 'd870505', keep: true },
  'asus-rog-phone-8-pro': { front: 'p870514', back: 'd870515', keep: true },
  'asus-rog-phone-6': { front: 'p651837', back: 'd651847', keep: true },
  'asus-rog-phone-9': { front: 'p1006254', back: 'd1006245', keep: true },
  'asus-rog-phone-9-fe': { front: 'p1041540', back: 'd1041545', backOpts: ['--blob=largest'] },
  'asus-zenfone-9': { front: 'p660662', back: 'd660666', keep: true },
  'asus-zenfone-10': { front: 'p791354', back: 'd791358', keep: true },
  'asus-zenfone-11-ultra': { front: 'p898629', back: 'd898636', keep: true },
  'fairphone-5': { front: 'p815410', back: 'd815404' },
  'fairphone-6': { front: 'd1103588', back: 'd1103585' },
  'honor-8x': { front: 'p156696', back: 'd156713' },
  'honor-9x': { front: 'p224671', back: 'd277372', keep: true },
  'honor-10': { front: 'p136529', back: 'd136531', backOpts: ['--crop=315,0,315,496'] },
  'honor-10-lite': { front: 'p171487', back: 'd171495' },
  'honor-20': { front: 'p210283', back: 'd210307' },
  'honor-20-pro': { front: 'p210229', back: 'd210265' },
  'honor-50': { front: 'p517095', back: 'd517089' },
  'honor-70': { front: 'p637084', back: 'd637114' },
  'honor-90': { front: 'p779555', back: 'd779570' },
  'honor-90-gt': { front: 'p861965', back: 'd861989' },
  'honor-90-lite': { front: 'p787537', back: 'd787565' },
  'honor-90-pro': { front: 'p779900', back: 'd779886' },
  'honor-90-smart': { front: 'p904578', back: 'd904585' },
  'honor-100': { front: 'p850566', back: 'd850588' },
  'honor-100-pro': { front: 'p850608', back: 'd850633' },
  'honor-200': { front: 'p930833', back: 'd930841' },
  'honor-200-lite': { front: 'p923171', back: 'd923160' },
  'honor-200-pro': { front: 'p930852', back: 'd930868' },
  'honor-200-smart': { front: 'p973974', back: 'd973977' },
  'honor-300': { front: 'p1011853', back: 'd1011868' },
  'honor-300-pro': { front: 'p1011877', back: 'd1011880' },
  'honor-300-ultra': { front: 'p1011887', back: 'd1011891' },
  'honor-400': { front: 'p1081106', back: 'd1092003' },
  'honor-400-lite': { front: 'd1068746', back: 'd1068745' },
  'honor-400-pro': { front: 'p1081109', back: 'd1093220' },
  'honor-400-smart': { front: 'p1120676', back: 'd1120678', keep: true },
  'honor-500': { front: 'p1163468', back: 'd1166702' },
  'honor-500-pro': { front: 'p1163483', back: 'd1166710' },
  'honor-600-lite-5g': { front: 'p1212401', back: 'd1212391' },
  'honor-600': { front: 'p1230931', back: 'd1230924' },
  'honor-600-pro': { front: 'p1230933', back: 'd1232023' },
  'honor-600-smart': { front: 'p1256462', back: 'd1256458' },
  'honor-gt': { front: 'p1018534', back: 'd1018519' },
  'honor-gt-pro': { front: 'p1075257', back: 'd1075251' },
  'honor-magic-4-pro': { front: 'p608192', back: 'd608221' },
  'honor-magic-5': { front: 'p746905', back: 'd746914' },
  'honor-magic-5-lite': { front: 'p738215', back: 'd738240' },
  'honor-magic-5-pro': { front: 'p742901', back: 'd742906' },
  'honor-magic-6': { front: 'p871156', back: 'd871165' },
  'honor-magic-6-lite': { front: 'p806687', back: 'd863838' },
  'honor-magic-6-pro': { front: 'p870994', back: 'd871013' },
  'honor-magic-6-ultimate': { front: 'p900435', back: 'd900480' },
  'honor-magic-7': { front: 'p997631', back: 'd997639' },
  'honor-magic-7-lite': { front: 'p1020043', back: 'd1020045', keep: true },
  'honor-magic-7-pro': { front: 'p997675', back: 'd997673' },
  'honor-magic-8': { front: 'p1148676', back: 'd1148660' },
  'honor-magic-8-pro': { front: 'p1148694', back: 'd1148690' },
  'honor-magic-8-pro-air': { front: 'p1192236', back: 'd1192254' },
  'honor-magic-9': { front: 'p1294939', back: 'd1294916' },
  'honor-magic-9-super': { front: 'p1294939', back: 'd1294927' },
  'honor-magic-v2': { front: 'p796811', back: 'd796819', keep: true },
  'honor-magic-v3': { front: 'p796811', back: 'd949948', keep: true },
  'honor-magic-v5': { front: 'p1104571', back: 'd1104589', keep: true },
  'honor-power': { front: 'p1076743', back: 'd1076745' },
  'honor-power-2': { front: 'p1186930', back: 'd1186929' },
  'honor-robot-phone': { front: 'p1298279', back: 'd1298278' },
  'honor-turbo': { front: 'p1307473', back: 'd1307464', keep: true },
  'honor-win': { front: 'p1181671', back: 'd1181672', keep: true },
  'honor-win-2': { front: 'p1302736', back: 'd1302716', keep: true },
  'honor-win-rt': { front: 'p1181671', back: 'd1181684', keep: true },
  'honor-win-turbo': { front: 'p1251227', back: 'd1251221' },
  'honor-win-turbo-2': { front: 'p1306511', back: 'd1303091', keep: true },
  'honor-x5d': { front: 'p1233387', back: 'd1233382', keep: true },
  'honor-x6b': { front: 'p937809', back: 'd937812', keep: true },
  'honor-x5d-plus': { front: 'p1233387', back: 'd1233384', keep: true },
  'honor-x6c': { front: 'p1096071', back: 'd1096074' },
  'honor-x7': { front: 'p618299', back: 'd618304' },
  'honor-x7a': { front: 'p724715', back: 'd724718', keep: true },
  'honor-x7b': { front: 'p863866', back: 'd863867' },
  'honor-x7c': { front: 'p1018837', back: 'd1018842' },
  'honor-x7c-5g': { front: 'p1018837', back: 'd1018841' },
  'honor-x7d': { front: 'p1127187', back: 'd1127182' },
  'honor-x7e': { front: 'p1242677', back: 'd1242669' },
  'honor-x8a': { front: 'p735994', back: 'd736006' },
  'honor-x8b': { front: 'p860993', back: 'd860995' },
  'honor-x8c': { front: 'p1034630', back: 'd1034645' },
  'honor-x8d': { front: 'p1248164', back: 'd1248161' },
  'honor-x8e': { front: 'p1307450', back: 'd1307442', keep: true },
  'honor-x9a': { front: 'p724687', back: 'd724696' },
  'honor-x9b': { front: 'p806687', back: 'd806702' },
  'honor-x9c': { front: 'p1003557', back: 'd1003559', backOpts: ['--blob=largest'] },
  'honor-x9d': { front: 'p1142463', back: 'd1142472' },
  'honor-x9e-pro': { front: 'p1298316', back: 'd1298315' },
  'honor-x9e-s': { front: 'p1307481', back: 'd1307480', keep: true },
  'honor-x60': { front: 'p991860', back: 'd991872' },
  'honor-x60-pro': { front: 'p991873', back: 'd991881' },
  'honor-x70': { front: 'p1110259', back: 'd1110270' },
  'honor-x80-pro-max': { front: 'p1256480', back: 'd1256474' },
  'honor-x8-2022': { front: 'p611314', back: 'd611318' },
  'honor-magic-8-lite-5g': { front: 'p1172790', back: 'd1172793' },
  'honor-play-11': { front: 'p1290263', back: 'd1290254' },
  'honor-win-rt-2': { front: 'p1302742', back: 'd1302723', keep: true },
  'fairphone-6-plus': { front: 'd1280008', back: 'd1280003' },
  'honor-8a': { front: 'p182183', back: 'd182191' },
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
