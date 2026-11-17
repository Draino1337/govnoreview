# Источники снимков телефонов

Кадр `public/phones/<id>.webp` собирает `scripts/combine.mjs` из вырезок `research/parts/<id>-front.webp` (экран) и `<id>-back.webp` (спина); вырезки сделаны скриптом `scripts/cutout.mjs` из снимков, перечисленных ниже. Сами исходники в репозиторий не входят (папка `research/img-src/` в `.gitignore`), все изображения принадлежат их производителям.

- **Kimovil** — галерея устройства на странице `https://www.kimovil.com/en/where-to-buy-<модель>` (открывается кликом по фото). Номер вида `p<id>` — кадр «вид спереди» (`phone_front`), `d<id>` — кадр из `default`; `<id>` — число в имени файла `thumb_<id>_…_big.jpg` на `cdn-files.kimovil.com`. Спины у Kimovil почти везде — композиция «спина + экран», где экран лежит поверх спины.
- **Samsung US** — кадры галереи на странице покупки samsung.com/us (PNG с прозрачным фоном, `images.samsung.com/is/image/samsung/p6pim/us/…`).
- **Apple** — композиции «спина + экран» из магазина Apple (`as-images.apple.com/is/<имя>`).

## Как собирается кадр

Во всех кадрах спина лежит поверх экрана и закрывает его на 25% ширины (`OVERLAP` в скрипте), на экран от спины ложится мягкая тень. Режимы сборки:

| Режим | Что делает | Телефоны |
| --- | --- | --- |
| `pure` | спина целиком отдельным кадром — просто кладём поверх экрана | шесть Samsung, Xiaomi 17T Pro |
| `keep` | композиция источника уже устроена как нужно (спина сверху) или это трёхмерная композиция Apple — берём как есть | iPhone 18 Pro Max, 17 Pro Max, 17 Pro, 17; Oppo Find X9 Ultra |
| `split` | спина и экран стоят рядом, режем по прозрачному зазору | Poco F9 Ultra |
| `complete` | в композиции источника экран лежит поверх спины и закрывает её правый край: берём видимую часть спины и достраиваем скрытую полосу | остальные 15 моделей: iPhone 16 Pro Max, 16, 15 и 12 моделей Kimovil |

Что именно достраивается в режиме `complete` (скрытая полоса — 17–45% ширины спины): цвет панели по строкам берётся у границы экрана и плавно переходит к цвету левого края, контур и кромка справа — зеркало левых. Камеры, логотипы и надписи, которые лежат в видимой части, не меняются; надпись, перерезанную краем экрана, плавно гасим. Для отдельных моделей достройка особая (`SPECS` в скрипте): у Vivo кольцо камеры вплотную к экрану, у Redmi Note 15 Pro квадратный блок камер закрыт наполовину и достроен зеркалом, у Xiaomi 17 Pro Max блок камер закончен скруглённым краем, у Poco F8 Ultra фактура ткани продолжена отражением соседней полосы, у Pixel полоса камер идёт через всю ширину. Это приближение, а не настоящий снимок скрытой части.

`iPhone 17` — исключение: у источника только трёхмерная композиция Apple, где экран лежит поверх спины (спина у неё повёрнута, и честно достроить плоскую нельзя), поэтому она взята как есть.

## Откуда какая вырезка

| Телефон | Экран | Спина |
| --- | --- | --- |
| `samsung-galaxy-s26-ultra` | Samsung US, кадр 550994049 | Samsung US, кадр 550994059 |
| `samsung-galaxy-s25-ultra` | Samsung US, кадр 548617078 | Samsung US, кадр 548617075 |
| `samsung-galaxy-s25` | Samsung US, кадр 547068493 | Samsung US, кадр 547068490 |
| `samsung-galaxy-s26-fe` | Samsung US, кадр 554292601 | Samsung US, кадр 554292598 |
| `samsung-galaxy-s25-fe` | Samsung US, кадр 548774439 | Samsung US, кадр 548774436 |
| `samsung-galaxy-a57-5g` | Samsung US, кадр 551691213 | Samsung US, кадр 551691216 |
| `samsung-galaxy-a56-5g` | Kimovil p1048638 | Kimovil d1052735 |
| `apple-iphone-18-pro-max` | Kimovil p1287207 | Apple: iphone-18-pro-finish-select-202609-6-9inch-burgundy |
| `apple-iphone-17-pro-max` | Kimovil p1133112 | Apple: iphone-17-pro-finish-select-202509-6-9inch-cosmicorange |
| `apple-iphone-17-pro` | Kimovil p1133102 | Apple: iphone-17-pro-finish-select-202509-6-3inch-deepblue |
| `apple-iphone-17` | Kimovil p1133088 | Apple: iphone-17-finish-select-mistblue-202509 |
| `apple-iphone-16-pro-max` | Kimovil p975674 | Apple: iphone-16-pro-finish-select-202409-6-9inch-deserttitanium |
| `apple-iphone-16` | Kimovil p975708 | Apple: iphone-16-finish-select-202409-6-1inch-ultramarine |
| `apple-iphone-15` | Kimovil p820071 | Apple: iphone-15-finish-select-202309-6-1inch-blue |
| `google-pixel-10-pro-xl` | Kimovil p1120732 | Kimovil d1120743 |
| `google-pixel-10` | Kimovil p1120715 | Kimovil d1120696 |
| `xiaomi-17-pro-max` | Kimovil p1139718 | Kimovil d1139713 |
| `xiaomi-17t-pro` | Kimovil p1244241 | Kimovil d1244237 (чистая спина) |
| `xiaomi-poco-x8-pro-max` | Kimovil p1217581 | Kimovil d1217569 |
| `xiaomi-poco-f8-pro` | Kimovil p1166693 | Kimovil d1166677 |
| `xiaomi-poco-f8-ultra` | Kimovil p1166676 | Kimovil d1166659 |
| `xiaomi-poco-f9-ultra` | Kimovil p1281503 | Kimovil d1281544 |
| `xiaomi-redmi-note-17-pro` | Kimovil p1264556 | Kimovil d1264551 |
| `xiaomi-redmi-note-15-pro-5g` | Kimovil p1170334 | Kimovil d1170320 |
| `oneplus-16` | Kimovil p1300848 | Kimovil d1300842 |
| `oneplus-15` | Kimovil p1149050 | Kimovil d1149027 |
| `vivo-x300-ultra` | Kimovil p1223349 | Kimovil d1222296 |
| `oppo-find-x9-ultra` | Kimovil p1223378 | Kimovil d1228191 |

В режимах `complete`, `keep` и `split` готовая композиция (колонка «Спина») несёт и экран, поэтому «Экран» отдельно нужен только в режимах `pure` и `complete`.
