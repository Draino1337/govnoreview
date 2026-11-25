# Источники снимков телефонов

## Сейчас на сайте: присланные кадры

С 17.11.2026 все 63 кадра на сайте — присланные владельцем сайта готовые композиции «спина + экран» (PNG с прозрачным фоном, около 1150×1370 px). Владелец сделал их на основе прежних кадров сайта (описаны ниже). 35 Google Pixel, добавленные тем же днём, сначала были собраны из Kimovil (см. ниже), а затем тоже заменены присланными кадрами. 18.11.2026 также пришли кадры 45 новых iPhone; затем и iPhone 2G, 3G и 3GS (собраны из снимков GSMArena; спина 2G — по фото Robert Scoble с Wikimedia Commons, «Original iPhone rear.jpg», CC BY 2.0, автор указан в подвале сайта). Исходники PNG в репозиторий не входят; очищенные копии лежат в `research/parts/<id>-user.webp`.

18.11.2026 пришли кадры 31 флагмана из списка «Лучшие флагманы». Владелец сделал их на основе сборок из Kimovil (строки в `scripts/kimovil.mjs`).

20.11.2026 пришли кадры 21 Huawei P и Pura. Владелец сделал их на основе сборок из Kimovil (строки в `scripts/kimovil.mjs`). Тем же днём пришли кадры 12 Nothing и CMF, тоже на основе сборок из Kimovil.

Как заменить кадр присланным:

```bash
node scripts/user-photo.mjs <папка или файлы …>   # «<бренд> <модель>.png», как в src/data/phones.json
npm run data
```

`user-photo.mjs` определяет телефон по имени файла, чистит альфу (почти прозрачная «дымка» вокруг телефона с альфой ниже 40 убирается, корпус делается сплошным) и сохраняет `research/parts/<id>-user.webp`. `combine.mjs` предпочитает такой кадр всему остальному (режим `user`): уменьшает до 640 px по высоте и сглаживает кромку (`scripts/edge.mjs`: ровный контур без лесенки, цвет кромки — без примеси белого фона). Чтобы вернуть телефону сборку из Kimovil, удалите его `<id>-user.webp` и запустите `node scripts/combine.mjs <id>`.

## Запасной вариант: сборка из Kimovil

Все снимки — из галерей **Kimovil** (`https://www.kimovil.com/en/where-to-buy-<модель>`, файлы с `cdn-files.kimovil.com`). Исключение пока одно: Galaxy S26 FE, у которого на Kimovil нет ни одного снимка (см. ниже). Все изображения принадлежат их производителям.

Номер кадра: `p<n>` — снимок «вид спереди» (`phone_front/…/thumb_<n>_phone_front_big.jpg`), `d<n>` — кадр галереи (`default/…/thumb_<n>_default_big.jpg`). Размер `_big` — самый крупный, который отдаёт Kimovil. Папки в пути считаются из номера: `⌊n/100000⌋+1` (4 цифры) и `⌊n%100000/1000⌋+1` (2 цифры).

## Как собирается кадр

1. `node scripts/kimovil.mjs [id …]` скачивает исходники в `research/img-src/<id>/` (папка в `.gitignore`) и делает вырезки `research/parts/<id>-front.webp` и `<id>-back.webp` скриптом `scripts/cutout.mjs`. Таблица кадров — в начале `scripts/kimovil.mjs`.
2. `node scripts/combine.mjs [id …]` собирает `public/phones/<id>.webp`.
3. `npm run data` пересчитывает отношение сторон кадров в `src/data/phones.json`.

Во всех кадрах спина слева, экран лежит поверх неё справа. Экран — всегда снимок спереди Kimovil, спина — по возможности отдельный кадр того же цвета, что обои на экране. Режимы:

| Режим | Что делает | Телефоны |
| --- | --- | --- |
| `pure` | спина отдельным кадром; экран кладём поверх, он закрывает 25% ширины спины (`OVERLAP` в `combine.mjs`), на спину ложится мягкая тень | все остальные |
| `keep` | готовая композиция Kimovil «спина + экран» с экраном сверху, берём как есть | Galaxy A57, Xiaomi 17 Pro Max, Poco F8 Pro, Redmi Note 17 Pro, Redmi Note 15 Pro, OnePlus 16, OnePlus 15 и многие Pixel (см. таблицу) |

`keep` — там, где у Kimovil нет прямого снимка спины (только композиции или спина под углом).

Особые случаи вырезки (параметры `cutout.mjs`):

- **iPhone** (`--blob=largest`) — у Kimovil спина снята рядом с профилем телефона; оставляем только спину. Эти кадры у Kimovil мелкие (≈300 px по высоте), при сборке растягиваются примерно вдвое, поэтому спины iPhone мягче, чем у остальных.
- **Oppo Find X9 Ultra** (`--crop`, `--mirror=right`) — отдельной прямой спины нет; берём композицию, где спина лежит поверх экрана, режем по правой кромке спины, а форму правых углов повторяем с левых.
- **Пол и тени** (`--floor=<tol>[,<sat>]`) — у многих Pixel под телефоном светлый пол с тенью или отражением; после вырезки фона от нижней четверти кадра заливкой убираются почти белые и почти серые пиксели. Подбирается по телефону (`--floor=60`, у Pixel `150,25`, у 9a `80,80`).
- **Pixel 9 Pro Fold** (`--crop`, `--round=44`) — экран снят вплотную к краям кадра; обрезаем и накладываем маску скруглённого прямоугольника.
- **Pixel 3, 3 XL** (`--alphamin=90`) — исходник уже прозрачный, но с нарисованной полупрозрачной тенью; всё с альфой ниже 90 убирается.
- **Белые Pixel на белом фоне** (`--tol`): у Pixel 2 и 2 XL допуск снижен до 10 и 6, иначе съедается корпус.
- **Pixel XL, 3a XL, 4a 5G, 10a, 11 Pro, 11 Pro XL** (`--crop`) — спина вырезана из общего снимка линейки или композиции; у Pixel XL этот снимок мелкий и под углом, поэтому спина мягче.
- **Pixel 3a XL** берёт кадры галереи 3a (у Kimovil она общая), **Pixel 4 и 4 XL** — одну общую галерею, показаны разными цветами.
- **Pixel 10, 10 Pro XL** (`--mirror=bottom`) — под телефоном снят светлый «отблеск пола»; срезаем его, нижние углы повторяем с верхних.

Общее для всех: фон вырезается заливкой от краёв без подъедания кромки (`--erode=0`, тёмная обводка корпуса остаётся), мелкие отдельные пятна (шум JPEG по краю — «белые точки») убираются, кромка альфы слегка сглаживается.

## Откуда какой кадр

| Телефон | Экран | Спина | Режим |
| --- | --- | --- | --- |
| `samsung-galaxy-s26-ultra` | p1202118 | d1202113 | pure |
| `samsung-galaxy-s25-ultra` | p1035304 | d1035322 | pure |
| `samsung-galaxy-s25` | p1035258 | d1035289 | pure |
| `samsung-galaxy-s25-fe` | p1130207 | d1132078 | pure |
| `samsung-galaxy-a57-5g` | — | d1220379 | keep |
| `samsung-galaxy-a56-5g` | p1048638 | d1052726 | pure |
| `apple-iphone-18-pro-max` | p1287207 | d1287132 | pure |
| `apple-iphone-17-pro-max` | p1133112 | d1133108 | pure |
| `apple-iphone-17-pro` | p1133102 | d1133092 | pure |
| `apple-iphone-17` | p1133088 | d1133073 | pure |
| `apple-iphone-16-pro-max` | p975674 | d975661 | pure |
| `apple-iphone-16` | p975708 | d975712 | pure |
| `apple-iphone-15` | p820071 | d820072 | pure |
| `google-pixel-10-pro-xl` | p1120732 | d1120739 | pure |
| `google-pixel-10` | p1120715 | d1120705 | pure |
| `xiaomi-17-pro-max` | — | d1139713 | keep |
| `xiaomi-17t-pro` | p1244241 | d1244237 | pure |
| `xiaomi-poco-x8-pro-max` | p1217581 | d1217557 | pure |
| `xiaomi-poco-f8-pro` | — | d1166678 | keep |
| `xiaomi-poco-f8-ultra` | p1166676 | d1166667 | pure |
| `xiaomi-poco-f9-ultra` | p1281503 | d1281548 | pure |
| `xiaomi-redmi-note-17-pro` | — | d1264555 | keep |
| `xiaomi-redmi-note-15-pro-5g` | — | d1170320 | keep |
| `oneplus-16` | — | d1300845 | keep |
| `oneplus-15` | — | d1149027 | keep |
| `vivo-x300-ultra` | p1223349 | d1222302 | pure |
| `oppo-find-x9-ultra` | p1223378 | d1228191 | pure |
| `google-pixel` | p39851 | d40027 | keep |
| `google-pixel-xl` | p39854 | d40033 | pure |
| `google-pixel-2` | p93287 | d93407 | pure |
| `google-pixel-2-xl` | p93317 | d93406 | pure |
| `google-pixel-3` | p161509 | d161518 | keep |
| `google-pixel-3-xl` | p161490 | d161520 | keep |
| `google-pixel-3a` | p207251 | d207248 | keep |
| `google-pixel-3a-xl` | d207242 | d207250 | pure |
| `google-pixel-4` | p262010 | d262025 | keep |
| `google-pixel-4-xl` | p262010 | d262022 | keep |
| `google-pixel-4a` | p294762 | d398840 | keep |
| `google-pixel-4a-5g` | p421868 | d421867 | pure |
| `google-pixel-5` | p420538 | d420544 | pure |
| `google-pixel-6` | p562173 | d562188 | pure |
| `google-pixel-6-pro` | p556685 | d562170 | pure |
| `google-pixel-6a` | p576368 | d633083 | keep |
| `google-pixel-7` | p684872 | d684811 | keep |
| `google-pixel-7-pro` | p681678 | d681679 | keep |
| `google-pixel-7a` | p772514 | d768871 | keep |
| `google-pixel-fold` | p772544 | d772557 | pure |
| `google-pixel-8` | p828658 | d828656 | keep |
| `google-pixel-8-pro` | p828689 | d828686 | keep |
| `google-pixel-8a` | p922249 | d922243 | keep |
| `google-pixel-9` | p963003 | d963746 | pure |
| `google-pixel-9-pro` | p963762 | d963776 | pure |
| `google-pixel-9-pro-xl` | p963781 | d963794 | pure |
| `google-pixel-9-pro-fold` | p963037 | d963803 | pure |
| `google-pixel-9a` | p1060002 | d1060006 | keep |
| `google-pixel-10-pro` | p1120731 | d1120717 | keep |
| `google-pixel-10-pro-fold` | p1119279 | d1119278 | keep |
| `google-pixel-10a` | p1205591 | d1205578 | pure |
| `google-pixel-11` | p1275803 | d1275804 | pure |
| `google-pixel-11-pro` | p1275812 | d1275813 | pure |
| `google-pixel-11-pro-xl` | p1275822 | d1275821 | pure |
| `google-pixel-11-pro-fold` | p1275834 | d1275829 | pure |

В режиме `keep` композиция уже несёт экран, отдельный снимок спереди не нужен.

## Galaxy S26 FE

На Kimovil у него снимков нет, поэтому в таблицу `scripts/kimovil.mjs` он не входит. Раньше его кадр был собран из снимков Samsung US 554292601 (экран) и 554292598 (спина); сейчас на сайте присланный кадр (`research/parts/samsung-galaxy-s26-fe-user.webp`).

## Asus, Fairphone, Honor (партия из 108 моделей)

Сейчас на сайте присланные кадры всех 108 моделей (`research/parts/<id>-user.webp`). Исходно они собраны из Kimovil по таблице `scripts/kimovil.mjs`, выгружены владельцу PNG в «Фото Asus», «Фото Fairphone», «Фото Honor» и вернулись вырезанными. Файлы Fairphone зовутся без повтора бренда («Fairphone 6.png»), `user-photo.mjs` это понимает.

- Honor 8A — кадры страницы Kimovil «Huawei Honor 8A Prime» (тот же корпус; отдельной страницы 8A нет).
- Fairphone 6 Plus — на Kimovil «Fairphone Gen. 6+» (`fairphone-gen6-plus`).
- Honor X8 (2022) — `honor-x8`; Magic 8 Lite — `honor-magic8-lite`; Play 11 — `honor-play11`; Win RT 2 — `honor-win-rt2`.
- X5d Plus и X7c 5G: у Kimovil те же галереи, что у X5d и X7c, взята спина другого цвета.
- Magic 9 и 9 Super, Magic V2 и V3, Win и Win RT делят снимок спереди; складные (V2, V3, V5) — композиции `keep`, ровных спин нет.

## Samsung Galaxy S, Z Flip, Z Fold (партия из 37 моделей)

Сейчас на сайте присланные кадры всех 36 моделей (`research/parts/<id>-user.webp`). Исходно они собраны по таблице `scripts/kimovil.mjs` (ниже — откуда), выгружены владельцу PNG в «Фото Samsung» и вернулись вырезанными.

- Galaxy S27 Ultra — на Kimovil страницы нет (модель ещё не вышла), кадра нет, на сайте рисованная заглушка.
- Страницы Kimovil: Z Flip 4 — `samsung-z-flip4`, S24 FE — `samsung-galaxy-s24fe`, остальные Z — `samsung-galaxy-z-flip3-5g`, `…-z-fold3` и т. д.
- S26 и Z Flip 3: отдельной спины нет, спина вырезана `--crop` из композиции.
- Z Flip 5, Z Fold 5, Z Fold 7 и часть S (S20 Ultra, S21, S22, S23, S24) — композиции `keep`. Z Flip 5 — d796746 на тёмно-сером фоне, вырезан с `--tol=6`: корпус почти того же цвета, что фон, держит светлая кромка.
- Не с Kimovil (у него спины срезаны краем кадра или закрыты надписями), а официальные снимки со страниц GSMArena «pictures», файлы `gsm-N.jpg` положены в `research/img-src/<id>/` вручную:
  - Z Fold 3 — `samsung_galaxy_z_fold3_5g-pictures-10906`, снимок 1 (левая пара, `--crop=0,0,355,456`); Z Fold 4 — `…_z_fold4-pictures-11737`, снимок 2; Z Fold 6 — `…_z_fold6-pictures-13147`, снимок 2. Все три — композиции `keep`: развёрнутый телефон снаружи, спина и внешний экран.
  - S23 FE — `…_s23_fe-pictures-12520`, снимок 1: из него только спина (`--crop=356,0,304,611`), экран — Kimovil p821206.
  - На корпусах у GSMArena полупрозрачная надпись «www.GSMArena.com». В `gsm-Nc.jpg` она затёрта: прямоугольник надписи заменён полосой корпуса прямо над ним (x, y, ширина, высота): Fold 3 — 33,419,93,13; Fold 4 — 444,633,90,9; Fold 6 — 14,583,92,13; S23 FE — 538,591,88,11 и 626,591,6,8.
