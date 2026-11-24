/** имя файла картинки чипа в public/chips/<slug>.webp. Общее для сайта и scripts/build-data.mjs, scripts/chip-images.mjs */
export const chipSlug = (chip: string) => chip.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
