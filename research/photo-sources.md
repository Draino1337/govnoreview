# Источники снимков телефонов

Файлы `public/phones/<id>-front.webp` и `<id>-back.webp` сделаны скриптом `scripts/cutout.mjs` из снимков, перечисленных ниже. Сами исходники в репозиторий не входят (папка `research/img-src/` в `.gitignore`), все изображения принадлежат их производителям.

- **Kimovil** — галерея устройства на странице `https://www.kimovil.com/en/where-to-buy-<модель>` (открывается кликом по фото). Номер вида `p<id>` — кадр «вид спереди» (`phone_front`), `d<id>` — кадр из `default`; `<id>` — число в имени файла `thumb_<id>_…_big.jpg` на `cdn-files.kimovil.com`. «Сзади» у Kimovil почти везде композиция «спина + экран».
- **Samsung US** — кадры галереи на странице покупки samsung.com/us (PNG с прозрачным фоном, `images.samsung.com/is/image/samsung/p6pim/us/…`).
- **Apple** — композиции «спина + экран» из магазина Apple (`as-images.apple.com/is/<имя>`).

| Телефон | Спереди | Сзади |
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
