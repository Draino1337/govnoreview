// research/tsv/*.tsv  ->  src/data/phones.json
// Формат строки TSV:  секция|подраздел|параметр|значение A|значение B
//                     B|название замера|значение A|значение B   (бенчмарки и измерения)
// Чтобы добавить телефон: положите ещё одну выгрузку в research/tsv, опишите её в PAGES и запустите `npm run data`.
// Новые модели добавьте записью в src/data/changelog.ts — это Changelog на главной.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TSV_DIR = path.join(root, 'research', 'tsv');
const OUT = path.join(root, 'src', 'data', 'phones.json');

// Для каждого телефона показывается единый кадр «экран поверх спины»: public/phones/<id>.webp
// (собирается scripts/combine.mjs из вырезок в research/parts), а если файла нет — нарисованная задняя
// панель: body — градиент корпуса, cam — раскладка камер.
const PAGES = {
  's26u-17pm.tsv': [
    { id: 'samsung-galaxy-s26-ultra', brand: 'Samsung', name: 'Galaxy S26 Ultra', look: { body: ['#9d8cff', '#3b2d9e'], cam: 'col' } },
    { id: 'apple-iphone-17-pro-max', brand: 'Apple', name: 'iPhone 17 Pro Max', look: { body: ['#ffa35c', '#c24a0f'], cam: 'tri' } },
  ],
  '17pro-17.tsv': [
    { id: 'apple-iphone-17-pro', brand: 'Apple', name: 'iPhone 17 Pro', look: { body: ['#3a5fa8', '#0d1a38'], cam: 'tri' } },
    { id: 'apple-iphone-17', brand: 'Apple', name: 'iPhone 17', look: { body: ['#d3def2', '#8fa6cf'], cam: 'duo' } },
  ],
  'poco.tsv': [
    { id: 'xiaomi-poco-f9-ultra', brand: 'Xiaomi', name: 'Poco F9 Ultra', look: { body: ['#34343f', '#0d0d12'], cam: 'plate' } },
    { id: 'xiaomi-poco-f8-ultra', brand: 'Xiaomi', name: 'Poco F8 Ultra', look: { body: ['#f2f5fc', '#9bb4e8'], cam: 'plate' } },
  ],
  'a57-a56.tsv': [
    { id: 'samsung-galaxy-a57-5g', brand: 'Samsung', name: 'Galaxy A57 5G', look: { body: ['#3be0cb', '#0e7c72'], cam: 'col' } },
    { id: 'samsung-galaxy-a56-5g', brand: 'Samsung', name: 'Galaxy A56 5G', look: { body: ['#c2d1b4', '#7c8f6e'], cam: 'col' } },
  ],
  'redmi.tsv': [
    { id: 'xiaomi-redmi-note-17-pro', brand: 'Xiaomi', name: 'Redmi Note 17 Pro', look: { body: ['#ffab57', '#e5561a'], cam: 'plate' } },
    { id: 'xiaomi-redmi-note-15-pro-5g', brand: 'Xiaomi', name: 'Redmi Note 15 Pro 5G', look: { body: ['#8a85f5', '#3f3a9e'], cam: 'plate' } },
  ],
  'oneplus.tsv': [
    { id: 'oneplus-16', brand: 'OnePlus', name: '16', look: { body: ['#ece6d6', '#a89f86'], cam: 'ring' } },
    { id: 'oneplus-15', brand: 'OnePlus', name: '15', look: { body: ['#363636', '#0b0b0b'], cam: 'ring' } },
  ],
  'iphone18-16pm.tsv': [
    { id: 'apple-iphone-18-pro-max', brand: 'Apple', name: 'iPhone 18 Pro Max', look: { body: ['#a8344d', '#3a0b18'], cam: 'tri' } },
    { id: 'apple-iphone-16-pro-max', brand: 'Apple', name: 'iPhone 16 Pro Max', look: { body: ['#dcc7a8', '#8c7355'], cam: 'tri' } },
  ],
  'iphone16-15.tsv': [
    { id: 'apple-iphone-16', brand: 'Apple', name: 'iPhone 16', look: { body: ['#8aa7ff', '#3a55b8'], cam: 'duo' } },
    { id: 'apple-iphone-15', brand: 'Apple', name: 'iPhone 15', look: { body: ['#f4d4d8', '#c79aa0'], cam: 'duo' } },
  ],
  's25u-s25.tsv': [
    { id: 'samsung-galaxy-s25-ultra', brand: 'Samsung', name: 'Galaxy S25 Ultra', look: { body: ['#c1ccdc', '#5d6b82'], cam: 'col' } },
    { id: 'samsung-galaxy-s25', brand: 'Samsung', name: 'Galaxy S25', look: { body: ['#c8e8dd', '#6aa896'], cam: 'col' } },
  ],
  's26fe-s25fe.tsv': [
    { id: 'samsung-galaxy-s26-fe', brand: 'Samsung', name: 'Galaxy S26 FE', look: { body: ['#7b93ff', '#2c3f9e'], cam: 'col' } },
    { id: 'samsung-galaxy-s25-fe', brand: 'Samsung', name: 'Galaxy S25 FE', look: { body: ['#a9cbea', '#4f7fb0'], cam: 'col' } },
  ],
  'pixel10.tsv': [
    { id: 'google-pixel-10-pro-xl', brand: 'Google', name: 'Pixel 10 Pro XL', look: { body: ['#4a5260', '#14171d'], cam: 'bar' } },
    { id: 'google-pixel-10', brand: 'Google', name: 'Pixel 10', look: { body: ['#ece47f', '#b5ab3a'], cam: 'bar' } },
  ],
  // все остальные Google Pixel: NanoReview, а Pixel, Pixel XL, Pixel 2, 2 XL и 3a XL — с GSMArena (на NanoReview их нет)
  'pixel1.tsv': [
    { id: 'google-pixel-xl', brand: 'Google', name: 'Pixel XL', look: { body: ['#3a3d42', '#16181b'], cam: 'col' } },
    { id: 'google-pixel', brand: 'Google', name: 'Pixel', look: { body: ['#e9ebee', '#b9bdc4'], cam: 'col' } },
  ],
  'pixel2.tsv': [
    { id: 'google-pixel-2-xl', brand: 'Google', name: 'Pixel 2 XL', look: { body: ['#f2f2f0', '#c9c9c6'], cam: 'col' } },
    { id: 'google-pixel-2', brand: 'Google', name: 'Pixel 2', look: { body: ['#9fb6cf', '#5f7891'], cam: 'col' } },
  ],
  'pixel3.tsv': [
    { id: 'google-pixel-3-xl', brand: 'Google', name: 'Pixel 3 XL', look: { body: ['#f4f4f2', '#cfcfcc'], cam: 'col' } },
    { id: 'google-pixel-3', brand: 'Google', name: 'Pixel 3', look: { body: ['#f3dcd3', '#d1b3a8'], cam: 'col' } },
  ],
  'pixel3a.tsv': [
    { id: 'google-pixel-3a-xl', brand: 'Google', name: 'Pixel 3a XL', look: { body: ['#38393c', '#141517'], cam: 'col' } },
    { id: 'google-pixel-3a', brand: 'Google', name: 'Pixel 3a', look: { body: ['#d9d3e6', '#ada3c2'], cam: 'col' } },
  ],
  'pixel4.tsv': [
    { id: 'google-pixel-4-xl', brand: 'Google', name: 'Pixel 4 XL', look: { body: ['#f2f2f0', '#cbcbc8'], cam: 'plate' } },
    { id: 'google-pixel-4', brand: 'Google', name: 'Pixel 4', look: { body: ['#f2a374', '#d1774a'], cam: 'plate' } },
  ],
  'pixel4a.tsv': [
    { id: 'google-pixel-4a-5g', brand: 'Google', name: 'Pixel 4a 5G', look: { body: ['#3b3c3f', '#151618'], cam: 'plate' } },
    { id: 'google-pixel-4a', brand: 'Google', name: 'Pixel 4a', look: { body: ['#2f3033', '#111214'], cam: 'plate' } },
  ],
  'pixel5.tsv': [
    { id: 'google-pixel-5', brand: 'Google', name: 'Pixel 5', look: { body: ['#b8c4b0', '#87957f'], cam: 'plate' } },
  ],
  'pixel6.tsv': [
    { id: 'google-pixel-6-pro', brand: 'Google', name: 'Pixel 6 Pro', look: { body: ['#f5e9c8', '#d6c393'], cam: 'bar' } },
    { id: 'google-pixel-6', brand: 'Google', name: 'Pixel 6', look: { body: ['#f2b8a6', '#d58c78'], cam: 'bar' } },
  ],
  'pixel7.tsv': [
    { id: 'google-pixel-7-pro', brand: 'Google', name: 'Pixel 7 Pro', look: { body: ['#c7c3b3', '#8f8b7b'], cam: 'bar' } },
    { id: 'google-pixel-7', brand: 'Google', name: 'Pixel 7', look: { body: ['#e6e9c6', '#bcc28f'], cam: 'bar' } },
  ],
  'pixel7a-6a.tsv': [
    { id: 'google-pixel-7a', brand: 'Google', name: 'Pixel 7a', look: { body: ['#b9cfe3', '#7f9cb8'], cam: 'bar' } },
    { id: 'google-pixel-6a', brand: 'Google', name: 'Pixel 6a', look: { body: ['#c9d6c3', '#97a891'], cam: 'bar' } },
  ],
  'pixel8.tsv': [
    { id: 'google-pixel-8-pro', brand: 'Google', name: 'Pixel 8 Pro', look: { body: ['#b8d3ea', '#7fa3c4'], cam: 'bar' } },
    { id: 'google-pixel-8', brand: 'Google', name: 'Pixel 8', look: { body: ['#f1d5cf', '#d2aaa1'], cam: 'bar' } },
  ],
  'pixel9a-8a.tsv': [
    { id: 'google-pixel-9a', brand: 'Google', name: 'Pixel 9a', look: { body: ['#c9c6e6', '#9893c4'], cam: 'bar' } },
    { id: 'google-pixel-8a', brand: 'Google', name: 'Pixel 8a', look: { body: ['#c6e3cf', '#90b99c'], cam: 'bar' } },
  ],
  'pixel9pro.tsv': [
    { id: 'google-pixel-9-pro-xl', brand: 'Google', name: 'Pixel 9 Pro XL', look: { body: ['#3c3e42', '#151619'], cam: 'bar' } },
    { id: 'google-pixel-9-pro', brand: 'Google', name: 'Pixel 9 Pro', look: { body: ['#c4c1b4', '#8e8b7f'], cam: 'bar' } },
  ],
  'pixel9-10a.tsv': [
    { id: 'google-pixel-9', brand: 'Google', name: 'Pixel 9', look: { body: ['#f2c4d6', '#d293ad'], cam: 'bar' } },
    { id: 'google-pixel-10a', brand: 'Google', name: 'Pixel 10a', look: { body: ['#d8d0ea', '#a99dc9'], cam: 'bar' } },
  ],
  'pixel10pro.tsv': [
    { id: 'google-pixel-10-pro', brand: 'Google', name: 'Pixel 10 Pro', look: { body: ['#c3c8cf', '#868c96'], cam: 'bar' } },
    { id: 'google-pixel-10-pro-fold', brand: 'Google', name: 'Pixel 10 Pro Fold', look: { body: ['#c9d8c9', '#93a893'], cam: 'bar' } },
  ],
  'pixel-fold.tsv': [
    { id: 'google-pixel-9-pro-fold', brand: 'Google', name: 'Pixel 9 Pro Fold', look: { body: ['#efece4', '#cbc6b8'], cam: 'bar' } },
    { id: 'google-pixel-fold', brand: 'Google', name: 'Pixel Fold', look: { body: ['#efede8', '#c9c5bc'], cam: 'bar' } },
  ],
  'pixel11pro.tsv': [
    { id: 'google-pixel-11-pro-xl', brand: 'Google', name: 'Pixel 11 Pro XL', look: { body: ['#3d4045', '#15171a'], cam: 'bar' } },
    { id: 'google-pixel-11-pro', brand: 'Google', name: 'Pixel 11 Pro', look: { body: ['#d9d6cc', '#a6a294'], cam: 'bar' } },
  ],
  'pixel11.tsv': [
    { id: 'google-pixel-11', brand: 'Google', name: 'Pixel 11', look: { body: ['#b9cde6', '#7f9cc2'], cam: 'bar' } },
    { id: 'google-pixel-11-pro-fold', brand: 'Google', name: 'Pixel 11 Pro Fold', look: { body: ['#3a3c3f', '#141517'], cam: 'bar' } },
  ],
  // остальные iPhone: NanoReview, а iPhone 2G … SE (2016) — с GSMArena (на NanoReview их нет)
  'iphone2g-3g.tsv': [
    { id: 'apple-iphone-3g', brand: 'Apple', name: 'iPhone 3G', look: { body: ['#2b2c30', '#0e0f11'], cam: 'col' } },
    { id: 'apple-iphone-2g', brand: 'Apple', name: 'iPhone 2G', look: { body: ['#c9ccd1', '#8b9097'], cam: 'col' } },
  ],
  'iphone3gs-4.tsv': [
    { id: 'apple-iphone-4', brand: 'Apple', name: 'iPhone 4', look: { body: ['#2a2b2e', '#0d0e10'], cam: 'col' } },
    { id: 'apple-iphone-3gs', brand: 'Apple', name: 'iPhone 3GS', look: { body: ['#f2f2f2', '#c8c8c8'], cam: 'col' } },
  ],
  'iphone4s-5.tsv': [
    { id: 'apple-iphone-5', brand: 'Apple', name: 'iPhone 5', look: { body: ['#3a3b3f', '#141518'], cam: 'col' } },
    { id: 'apple-iphone-4s', brand: 'Apple', name: 'iPhone 4S', look: { body: ['#f4f4f4', '#cdcdcd'], cam: 'col' } },
  ],
  'iphone5s-5c.tsv': [
    { id: 'apple-iphone-5s', brand: 'Apple', name: 'iPhone 5s', look: { body: ['#e8d8bf', '#b9a17c'], cam: 'col' } },
    { id: 'apple-iphone-5c', brand: 'Apple', name: 'iPhone 5c', look: { body: ['#7fb5e8', '#3f7fc2'], cam: 'col' } },
  ],
  'iphone6.tsv': [
    { id: 'apple-iphone-6-plus', brand: 'Apple', name: 'iPhone 6 Plus', look: { body: ['#e9e9ea', '#b4b6ba'], cam: 'col' } },
    { id: 'apple-iphone-6', brand: 'Apple', name: 'iPhone 6', look: { body: ['#7d7f84', '#45474b'], cam: 'col' } },
  ],
  'iphone6s.tsv': [
    { id: 'apple-iphone-6s-plus', brand: 'Apple', name: 'iPhone 6s Plus', look: { body: ['#f0d2c9', '#c9a096'], cam: 'col' } },
    { id: 'apple-iphone-6s', brand: 'Apple', name: 'iPhone 6s', look: { body: ['#e8d8bf', '#b9a17c'], cam: 'col' } },
  ],
  'iphone-se2016.tsv': [
    { id: 'apple-iphone-se-2016', brand: 'Apple', name: 'iPhone SE (2016)', look: { body: ['#f0d2c9', '#c9a096'], cam: 'col' } },
  ],
  'iphone7.tsv': [
    { id: 'apple-iphone-7-plus', brand: 'Apple', name: 'iPhone 7 Plus', look: { body: ['#2a2b2e', '#0b0c0e'], cam: 'duo' } },
    { id: 'apple-iphone-7', brand: 'Apple', name: 'iPhone 7', look: { body: ['#d84a4a', '#8f1f24'], cam: 'col' } },
  ],
  'iphone8.tsv': [
    { id: 'apple-iphone-8-plus', brand: 'Apple', name: 'iPhone 8 Plus', look: { body: ['#efe1d2', '#c4ab92'], cam: 'duo' } },
    { id: 'apple-iphone-8', brand: 'Apple', name: 'iPhone 8', look: { body: ['#ececec', '#bdbdbd'], cam: 'col' } },
  ],
  'iphonex-xr.tsv': [
    { id: 'apple-iphone-xr', brand: 'Apple', name: 'iPhone XR', look: { body: ['#f7d64a', '#c9a514'], cam: 'col' } },
    { id: 'apple-iphone-x', brand: 'Apple', name: 'iPhone X', look: { body: ['#e9e9e7', '#b9bab8'], cam: 'duo' } },
  ],
  'iphonexs.tsv': [
    { id: 'apple-iphone-xs-max', brand: 'Apple', name: 'iPhone XS Max', look: { body: ['#f2dcc0', '#c6a67f'], cam: 'duo' } },
    { id: 'apple-iphone-xs', brand: 'Apple', name: 'iPhone XS', look: { body: ['#3a3b3f', '#141518'], cam: 'duo' } },
  ],
  'iphone11pro.tsv': [
    { id: 'apple-iphone-11-pro-max', brand: 'Apple', name: 'iPhone 11 Pro Max', look: { body: ['#4f6250', '#24302a'], cam: 'tri' } },
    { id: 'apple-iphone-11-pro', brand: 'Apple', name: 'iPhone 11 Pro', look: { body: ['#e8dccb', '#b9a78e'], cam: 'tri' } },
  ],
  'iphone11-se2020.tsv': [
    { id: 'apple-iphone-11', brand: 'Apple', name: 'iPhone 11', look: { body: ['#c9b9e6', '#9583be'], cam: 'duo' } },
    { id: 'apple-iphone-se-2020', brand: 'Apple', name: 'iPhone SE (2020)', look: { body: ['#cf2b38', '#86131c'], cam: 'col' } },
  ],
  'iphone12pro.tsv': [
    { id: 'apple-iphone-12-pro-max', brand: 'Apple', name: 'iPhone 12 Pro Max', look: { body: ['#3f5b78', '#1b2a3b'], cam: 'tri' } },
    { id: 'apple-iphone-12-pro', brand: 'Apple', name: 'iPhone 12 Pro', look: { body: ['#efe0c6', '#c2a97d'], cam: 'tri' } },
  ],
  'iphone12.tsv': [
    { id: 'apple-iphone-12', brand: 'Apple', name: 'iPhone 12', look: { body: ['#2d4f8f', '#13244a'], cam: 'duo' } },
    { id: 'apple-iphone-12-mini', brand: 'Apple', name: 'iPhone 12 mini', look: { body: ['#c8e6cf', '#8fb99a'], cam: 'duo' } },
  ],
  'iphone13pro.tsv': [
    { id: 'apple-iphone-13-pro-max', brand: 'Apple', name: 'iPhone 13 Pro Max', look: { body: ['#a9c3df', '#6f8db0'], cam: 'tri' } },
    { id: 'apple-iphone-13-pro', brand: 'Apple', name: 'iPhone 13 Pro', look: { body: ['#5a6b58', '#2c3a2b'], cam: 'tri' } },
  ],
  'iphone13.tsv': [
    { id: 'apple-iphone-13', brand: 'Apple', name: 'iPhone 13', look: { body: ['#f2c6cf', '#c98d99'], cam: 'duo' } },
    { id: 'apple-iphone-13-mini', brand: 'Apple', name: 'iPhone 13 mini', look: { body: ['#2f4a63', '#13212f'], cam: 'duo' } },
  ],
  'iphone14pro.tsv': [
    { id: 'apple-iphone-14-pro-max', brand: 'Apple', name: 'iPhone 14 Pro Max', look: { body: ['#4a3f5c', '#211b2c'], cam: 'tri' } },
    { id: 'apple-iphone-14-pro', brand: 'Apple', name: 'iPhone 14 Pro', look: { body: ['#e9e2d4', '#b8ad97'], cam: 'tri' } },
  ],
  'iphone14.tsv': [
    { id: 'apple-iphone-14-plus', brand: 'Apple', name: 'iPhone 14 Plus', look: { body: ['#c9d4ea', '#8d9ec2'], cam: 'duo' } },
    { id: 'apple-iphone-14', brand: 'Apple', name: 'iPhone 14', look: { body: ['#c9b9e6', '#9583be'], cam: 'duo' } },
  ],
  'iphone-se2022-16e.tsv': [
    { id: 'apple-iphone-16e', brand: 'Apple', name: 'iPhone 16e', look: { body: ['#f2f2f0', '#c4c4c1'], cam: 'col' } },
    { id: 'apple-iphone-se-2022', brand: 'Apple', name: 'iPhone SE (2022)', look: { body: ['#2a2c30', '#0d0e10'], cam: 'col' } },
  ],
  'iphone15pro.tsv': [
    { id: 'apple-iphone-15-pro-max', brand: 'Apple', name: 'iPhone 15 Pro Max', look: { body: ['#8e8a82', '#55524c'], cam: 'tri' } },
    { id: 'apple-iphone-15-pro', brand: 'Apple', name: 'iPhone 15 Pro', look: { body: ['#3a4152', '#171b24'], cam: 'tri' } },
  ],
  'iphone15plus-16plus.tsv': [
    { id: 'apple-iphone-16-plus', brand: 'Apple', name: 'iPhone 16 Plus', look: { body: ['#7fd6c9', '#3f9c8f'], cam: 'duo' } },
    { id: 'apple-iphone-15-plus', brand: 'Apple', name: 'iPhone 15 Plus', look: { body: ['#f5efc4', '#cfc68b'], cam: 'duo' } },
  ],
  'iphone16pro-air.tsv': [
    { id: 'apple-iphone-16-pro', brand: 'Apple', name: 'iPhone 16 Pro', look: { body: ['#c9bba5', '#93836c'], cam: 'tri' } },
    { id: 'apple-iphone-air', brand: 'Apple', name: 'iPhone Air', look: { body: ['#cfe3f2', '#93b3cc'], cam: 'col' } },
  ],
  'iphone18pro-17e.tsv': [
    { id: 'apple-iphone-18-pro', brand: 'Apple', name: 'iPhone 18 Pro', look: { body: ['#3d3a52', '#191726'], cam: 'tri' } },
    { id: 'apple-iphone-17e', brand: 'Apple', name: 'iPhone 17e', look: { body: ['#f0e4ec', '#c7aebc'], cam: 'col' } },
  ],
  'iphone-duo.tsv': [
    { id: 'apple-iphone-duo', brand: 'Apple', name: 'iPhone Duo', look: { body: ['#d9d4cc', '#a59f95'], cam: 'duo' } },
  ],
  // на этой странице источник сам поставил 17T Pro в первую колонку
  'xiaomi17.tsv': [
    { id: 'xiaomi-17t-pro', brand: 'Xiaomi', name: '17T Pro', look: { body: ['#6a5fe0', '#251f6b'], cam: 'plate' } },
    { id: 'xiaomi-17-pro-max', brand: 'Xiaomi', name: '17 Pro Max', look: { body: ['#f2f4f1', '#9fb3a8'], cam: 'plate' } },
  ],
  'poco-x8.tsv': [
    { id: 'xiaomi-poco-x8-pro-max', brand: 'Xiaomi', name: 'Poco X8 Pro Max', look: { body: ['#4f86f5', '#1b3a8f'], cam: 'plate' } },
    { id: 'xiaomi-poco-f8-pro', brand: 'Xiaomi', name: 'Poco F8 Pro', look: { body: ['#d6dce8', '#7f8ca6'], cam: 'plate' } },
  ],
  'vivo-oppo.tsv': [
    { id: 'vivo-x300-ultra', brand: 'Vivo', name: 'X300 Ultra', look: { body: ['#d3ecdc', '#6fa88a'], cam: 'ring' } },
    { id: 'oppo-find-x9-ultra', brand: 'Oppo', name: 'Find X9 Ultra', look: { body: ['#f59a4c', '#9a3c08'], cam: 'ring' } },
  ],
  's26plus.tsv': [
    { id: 'samsung-galaxy-s26-plus', brand: 'Samsung', name: 'Galaxy S26 Plus', look: { body: ['#c9d6ee', '#7d8fb5'], cam: 'col' } },
  ],
  'zfold8.tsv': [
    { id: 'samsung-galaxy-z-fold-8-ultra', brand: 'Samsung', name: 'Galaxy Z Fold 8 Ultra', look: { body: ['#2d3446', '#10131b'], cam: 'col' } },
    { id: 'samsung-galaxy-z-fold-8', brand: 'Samsung', name: 'Galaxy Z Fold 8', look: { body: ['#b9c3d4', '#6e7a90'], cam: 'col' } },
  ],
  'zflip8-razr.tsv': [
    { id: 'samsung-galaxy-z-flip-8', brand: 'Samsung', name: 'Galaxy Z Flip 8', look: { body: ['#c7d8f0', '#6f8ab8'], cam: 'duo' } },
    { id: 'motorola-razr-ultra-2026', brand: 'Motorola', name: 'Razr Ultra (2026)', look: { body: ['#7a2b3a', '#3a0f18'], cam: 'duo' } },
  ],
  'xiaomi18pro.tsv': [
    { id: 'xiaomi-18-pro-max', brand: 'Xiaomi', name: '18 Pro Max', look: { body: ['#2c2f35', '#0f1013'], cam: 'plate' } },
    { id: 'xiaomi-18-pro', brand: 'Xiaomi', name: '18 Pro', look: { body: ['#e9ecef', '#a9b1ba'], cam: 'plate' } },
  ],
  'xiaomi17u-18fold.tsv': [
    { id: 'xiaomi-17-ultra', brand: 'Xiaomi', name: '17 Ultra', look: { body: ['#2a2a2c', '#0c0c0d'], cam: 'ring' } },
    { id: 'xiaomi-18-fold', brand: 'Xiaomi', name: '18 Fold', look: { body: ['#3d4a5c', '#18202b'], cam: 'plate' } },
  ],
  'mate90.tsv': [
    { id: 'huawei-mate-90-pro-max', brand: 'Huawei', name: 'Mate 90 Pro Max', look: { body: ['#2d3a35', '#101815'], cam: 'ring' } },
    { id: 'huawei-mate-90-pro', brand: 'Huawei', name: 'Mate 90 Pro', look: { body: ['#e8e2d6', '#b3a88f'], cam: 'ring' } },
  ],
  'pura90-matext2.tsv': [
    { id: 'huawei-pura-90-pro-max', brand: 'Huawei', name: 'Pura 90 Pro Max', look: { body: ['#f0ede6', '#bdb5a3'], cam: 'plate' } },
    { id: 'huawei-mate-xt-2-ultimate', brand: 'Huawei', name: 'Mate XT 2 Ultimate', look: { body: ['#b5432f', '#5e1a10'], cam: 'plate' } },
  ],
  'honor.tsv': [
    { id: 'honor-magic-9-pro-max', brand: 'Honor', name: 'Magic 9 Pro Max', look: { body: ['#3a4b6b', '#161e2e'], cam: 'ring' } },
    { id: 'honor-magic-v6', brand: 'Honor', name: 'Magic V6', look: { body: ['#d9cdb6', '#9c8b6b'], cam: 'ring' } },
  ],
  'oppo-x10-x9pro.tsv': [
    { id: 'oppo-find-x10-pro-max', brand: 'Oppo', name: 'Find X10 Pro Max', look: { body: ['#2f3238', '#101114'], cam: 'ring' } },
    { id: 'oppo-find-x9-pro', brand: 'Oppo', name: 'Find X9 Pro', look: { body: ['#d4d9df', '#8a939d'], cam: 'plate' } },
  ],
  'n5-xfold6.tsv': [
    { id: 'oppo-find-n5', brand: 'Oppo', name: 'Find N5', look: { body: ['#e9e6e1', '#aaa49a'], cam: 'ring' } },
    { id: 'vivo-x-fold6', brand: 'Vivo', name: 'X Fold6', look: { body: ['#2f4a3e', '#122019'], cam: 'ring' } },
  ],
  'vivo-x500.tsv': [
    { id: 'vivo-x500-pro-max', brand: 'Vivo', name: 'X500 Pro Max', look: { body: ['#26282d', '#0c0d10'], cam: 'ring' } },
    { id: 'vivo-x500-pro', brand: 'Vivo', name: 'X500 Pro', look: { body: ['#dfe6ee', '#94a3b5'], cam: 'ring' } },
  ],
  'iqoo16-gt8pro.tsv': [
    { id: 'vivo-iqoo-16', brand: 'Vivo', name: 'iQOO 16', look: { body: ['#f2f2f2', '#b9b9b9'], cam: 'plate' } },
    { id: 'realme-gt-8-pro', brand: 'Realme', name: 'GT 8 Pro', look: { body: ['#ece6d8', '#b0a589'], cam: 'plate' } },
  ],
  'oneplus15t-13.tsv': [
    { id: 'oneplus-15t', brand: 'OnePlus', name: '15T', look: { body: ['#2f3136', '#111215'], cam: 'plate' } },
    { id: 'oneplus-13', brand: 'OnePlus', name: '13', look: { body: ['#24344f', '#0d1421'], cam: 'ring' } },
  ],
  'xperia-zenfone.tsv': [
    { id: 'sony-xperia-1-viii', brand: 'Sony', name: 'Xperia 1 VIII', look: { body: ['#3d4654', '#171b22'], cam: 'col' } },
    { id: 'asus-zenfone-12-ultra', brand: 'Asus', name: 'Zenfone 12 Ultra', look: { body: ['#c8ced6', '#7d8794'], cam: 'plate' } },
  ],
  'rog9-redmagic12.tsv': [
    { id: 'asus-rog-phone-9-pro', brand: 'Asus', name: 'ROG Phone 9 Pro', look: { body: ['#2a2b2e', '#0b0b0c'], cam: 'plate' } },
    { id: 'zte-nubia-red-magic-12-pro-plus', brand: 'ZTE', name: 'Nubia Red Magic 12 Pro Plus', look: { body: ['#25262a', '#09090b'], cam: 'plate' } },
  ],
  'z80u-nothing3.tsv': [
    { id: 'zte-nubia-z80-ultra', brand: 'ZTE', name: 'Nubia Z80 Ultra', look: { body: ['#3a3530', '#15120f'], cam: 'ring' } },
    { id: 'nothing-phone-3', brand: 'Nothing', name: 'Phone (3)', look: { body: ['#e8e8e8', '#a8a8a8'], cam: 'plate' } },
  ],
  'huawei-p30pro-p40lite.tsv': [
    { id: 'huawei-p30-pro', brand: 'Huawei', name: 'P30 Pro', look: { body: ['#9fd3e8', '#5a6fc0'], cam: 'col' } },
    { id: 'huawei-p40-lite', brand: 'Huawei', name: 'P40 Lite', look: { body: ['#3fc1a5', '#1d6b74'], cam: 'plate' } },
  ],
  'huawei-p40.tsv': [
    { id: 'huawei-p40-pro', brand: 'Huawei', name: 'P40 Pro', look: { body: ['#e9ecef', '#a6b0bb'], cam: 'col' } },
    { id: 'huawei-p40', brand: 'Huawei', name: 'P40', look: { body: ['#d6d9dd', '#8d949c'], cam: 'col' } },
  ],
  'huawei-p50pro-p60.tsv': [
    { id: 'huawei-p50-pro', brand: 'Huawei', name: 'P50 Pro', look: { body: ['#e8d2a6', '#b09155'], cam: 'col' } },
    { id: 'huawei-p60', brand: 'Huawei', name: 'P60', look: { body: ['#f0eee9', '#b8b2a6'], cam: 'ring' } },
  ],
  'huawei-p60pro-pura70.tsv': [
    { id: 'huawei-p60-pro', brand: 'Huawei', name: 'P60 Pro', look: { body: ['#e9e3d6', '#b2a88f'], cam: 'ring' } },
    { id: 'huawei-pura-70', brand: 'Huawei', name: 'Pura 70', look: { body: ['#2d2f35', '#0e0f12'], cam: 'plate' } },
  ],
  'huawei-pura70.tsv': [
    { id: 'huawei-pura-70-ultra', brand: 'Huawei', name: 'Pura 70 Ultra', look: { body: ['#2f3a32', '#0f1511'], cam: 'plate' } },
    { id: 'huawei-pura-70-pro', brand: 'Huawei', name: 'Pura 70 Pro', look: { body: ['#f2f2f0', '#bdbdb8'], cam: 'plate' } },
  ],
  'huawei-pura80.tsv': [
    { id: 'huawei-pura-80-pro', brand: 'Huawei', name: 'Pura 80 Pro', look: { body: ['#e7d5b8', '#a88d62'], cam: 'plate' } },
    { id: 'huawei-pura-80', brand: 'Huawei', name: 'Pura 80', look: { body: ['#2b2d33', '#0d0e11'], cam: 'plate' } },
  ],
  'huawei-pura80ultra.tsv': [
    { id: 'huawei-pura-80-ultra', brand: 'Huawei', name: 'Pura 80 Ultra', look: { body: ['#2a2b2f', '#0b0b0d'], cam: 'plate' } },
    { id: 'huawei-pura-80-pro-plus', brand: 'Huawei', name: 'Pura 80 Pro Plus', look: { body: ['#f0ede6', '#bdb5a3'], cam: 'plate' } },
  ],
  'huawei-pura90.tsv': [
    { id: 'huawei-pura-90-plus', brand: 'Huawei', name: 'Pura 90 Plus', look: { body: ['#d9e4ef', '#8ba2bd'], cam: 'plate' } },
    { id: 'huawei-pura-90', brand: 'Huawei', name: 'Pura 90', look: { body: ['#2c2e34', '#0e0f12'], cam: 'plate' } },
  ],
  'huawei-pura90pro.tsv': [
    { id: 'huawei-pura-90s-pro', brand: 'Huawei', name: 'Pura 90s Pro', look: { body: ['#e8e2d6', '#b3a88f'], cam: 'plate' } },
    { id: 'huawei-pura-90-pro', brand: 'Huawei', name: 'Pura 90 Pro', look: { body: ['#2d3a35', '#101815'], cam: 'plate' } },
  ],
  'huawei-purax-90spm.tsv': [
    { id: 'huawei-pura-x-max', brand: 'Huawei', name: 'Pura X Max', look: { body: ['#b5432f', '#5e1a10'], cam: 'plate' } },
    { id: 'huawei-pura-90s-pro-max', brand: 'Huawei', name: 'Pura 90s Pro Max', look: { body: ['#2a2b2f', '#0b0b0d'], cam: 'plate' } },
  ],
  'huawei-purax-view.tsv': [
    { id: 'huawei-pura-x-view', brand: 'Huawei', name: 'Pura X View', look: { body: ['#e9e6e1', '#aaa49a'], cam: 'plate' } },
  ],
  'nothing-cmf2pro-cmf1.tsv': [
    { id: 'nothing-cmf-phone-2-pro', brand: 'Nothing', name: 'CMF Phone 2 Pro', look: { body: ['#ececec', '#a9a9a9'], cam: 'col' } },
    { id: 'nothing-cmf-phone-1', brand: 'Nothing', name: 'CMF Phone 1', look: { body: ['#ff7a2f', '#c2470c'], cam: 'col' } },
  ],
  'nothing-phone2-phone1.tsv': [
    { id: 'nothing-phone-2', brand: 'Nothing', name: 'Phone (2)', look: { body: ['#ececec', '#a9a9a9'], cam: 'plate' } },
    { id: 'nothing-phone-1', brand: 'Nothing', name: 'Phone (1)', look: { body: ['#ececec', '#a9a9a9'], cam: 'plate' } },
  ],
  'nothing-phone2aplus-2a.tsv': [
    { id: 'nothing-phone-2a-plus', brand: 'Nothing', name: 'Phone (2a) Plus', look: { body: ['#9a9a9a', '#5a5a5a'], cam: 'plate' } },
    { id: 'nothing-phone-2a', brand: 'Nothing', name: 'Phone (2a)', look: { body: ['#ececec', '#a9a9a9'], cam: 'plate' } },
  ],
  'nothing-phone3alite-3a.tsv': [
    { id: 'nothing-phone-3a-lite', brand: 'Nothing', name: 'Phone (3a) Lite', look: { body: ['#2b2b2b', '#0c0c0c'], cam: 'col' } },
    { id: 'nothing-phone-3a', brand: 'Nothing', name: 'Phone (3a)', look: { body: ['#ececec', '#a9a9a9'], cam: 'col' } },
  ],
  'nothing-phone4a-3apro.tsv': [
    { id: 'nothing-phone-4a', brand: 'Nothing', name: 'Phone (4a)', look: { body: ['#ececec', '#a9a9a9'], cam: 'col' } },
    { id: 'nothing-phone-3a-pro', brand: 'Nothing', name: 'Phone (3a) Pro', look: { body: ['#9a9a9a', '#5a5a5a'], cam: 'plate' } },
  ],
  'nothing-phone4b-4apro.tsv': [
    { id: 'nothing-phone-4b', brand: 'Nothing', name: 'Phone (4b)', look: { body: ['#ececec', '#a9a9a9'], cam: 'col' } },
    { id: 'nothing-phone-4a-pro', brand: 'Nothing', name: 'Phone (4a) Pro', look: { body: ['#9a9a9a', '#5a5a5a'], cam: 'plate' } },
  ],
};

const MONTHS = { Январь: 1, Февраль: 2, Март: 3, Апрель: 4, Май: 5, Июнь: 6, Июль: 7, Август: 8, Сентябрь: 9, Октябрь: 10, Ноябрь: 11, Декабрь: 12 };
const EMPTY = new Set(['-', 'н/д', '']);

const num = (s) => {
  const m = String(s).replace(',', '.').match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
};

function released(text) {
  const m = text?.match(/([А-Яа-я]+)\s+(\d{4})/);
  return m && MONTHS[m[1]] ? `${m[2]}-${String(MONTHS[m[1]]).padStart(2, '0')}` : '';
}

function parse(text) {
  const rows = [[], []];
  const bench = [{}, {}];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const p = line.split('|');
    if (p[0] === 'H') continue;
    if (p[0] === 'B') {
      const [, title, a, b] = p;
      [a, b].forEach((v, i) => !EMPTY.has(v) && (bench[i][title] = v));
      continue;
    }
    const [sec, sub, rawLabel, a, b] = p;
    const label = rawLabel.replace(/\*$/, '');
    [a, b].forEach((v, i) => !EMPTY.has(v) && rows[i].push([sec, sub, label, v]));
  }
  return { rows, bench };
}

const PHOTO_DIR = path.join(root, 'public', 'phones');

// Отношение ширины к высоте вырезки (0 — файла нет). Страница резервирует под снимок место заранее,
// поэтому текст рядом с миниатюрой не прыгает, когда картинка догружается.
async function photoRatio(id) {
  const file = path.join(PHOTO_DIR, `${id}.webp`);
  if (!fs.existsSync(file)) return 0;
  const { width, height } = await sharp(file).metadata();
  // миниатюра для списков (PhoneArt size="xs", 46 px в высоту): 140 px хватает и для экранов 3x
  const sm = path.join(PHOTO_DIR, 'sm', `${id}.webp`);
  if (!fs.existsSync(sm) || fs.statSync(sm).mtimeMs < fs.statSync(file).mtimeMs) {
    fs.mkdirSync(path.dirname(sm), { recursive: true });
    await sharp(file).resize({ height: 140 }).webp({ quality: 82 }).toFile(sm);
  }
  return +(width / height).toFixed(4);
}

// оценки камеры DxOMARK: research/dxomark.tsv (id|модель|оценка|ссылка)
const DXO = new Map(
  fs.readFileSync(path.join(root, 'research', 'dxomark.tsv'), 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split('|')).map(([id, , s]) => [id, +s]),
);

// сенсоры камер: research/sensors.tsv (id|основная|сверхширокоугольная|телевик|источник), пусто — такой камеры нет
const SENSORS = new Map(
  fs.readFileSync(path.join(root, 'research', 'sensors.tsv'), 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split('|')).map(([id, ...s]) => [id, s]),
);
const LENS_GROUPS = ['Основной объектив', 'Сверхширокоугольный объектив', 'Телеобъектив'];
/** строка «Сенсор» — первой в группе объектива (или новой группой, если у модели её нет) */
function addSensors(id, rows) {
  const s = SENSORS.get(id);
  if (!s) return console.warn(`  нет сенсоров в research/sensors.tsv: ${id}`);
  LENS_GROUPS.forEach((group, k) => {
    if (!s[k]) return;
    const at = rows.findIndex((r) => r[0] === 'Основная камера' && r[1] === group);
    const row = ['Основная камера', group, 'Сенсор', s[k]];
    if (at >= 0) rows.splice(at, 0, row);
    else rows.splice(rows.findLastIndex((r) => r[0] === 'Основная камера') + 1 || rows.length, 0, row);
  });
}

const phones = [];
for (const [file, pair] of Object.entries(PAGES)) {
  const { rows, bench } = parse(fs.readFileSync(path.join(TSV_DIR, file), 'utf8'));
  for (const [i, meta] of pair.entries()) {
    addSensors(meta.id, rows[i]);
    const get = (label) => rows[i].find((r) => r[2] === label)?.[3] ?? '';
    const chip = get('Чипсет').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (chip && !fs.existsSync(path.join(root, 'public', 'chips', chip + '.webp')))
      console.warn(`  нет картинки чипа «${get('Чипсет')}»: добавьте строку в research/chips.tsv и запустите node scripts/chip-images.mjs`);
    phones.push({
      ...meta,
      photo: await photoRatio(meta.id),
      tier: get('Класс') || 'Флагман',
      released: released(get('Дата выхода')),
      price: num(get('Цена на момент выхода')) ?? 0,
      ...(DXO.has(meta.id) && { dxo: DXO.get(meta.id) }),
      rows: rows[i],
      bench: bench[i],
    });
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(phones));
const withPhoto = phones.filter((p) => p.photo).length;
console.log(`phones.json: ${phones.length} телефонов, ${(fs.statSync(OUT).size / 1024).toFixed(1)} КБ, кадров «спина + экран»: ${withPhoto}`);
for (const p of phones) {
  const ph = p.photo ? `кадр ${p.photo.toFixed(2)}` : 'нет кадра';
  console.log(`  ${p.id.padEnd(30)} ${ph.padEnd(10)} ${p.released}  $${p.price}  rows=${p.rows.length} bench=${Object.keys(p.bench).length}`);
}
