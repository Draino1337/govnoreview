import { chipSlug } from '../lib/chip.ts';

/** Квадратная картинка чипа (снимок или рендер самого чипа, см. research/chips.tsv). Название стоит рядом, поэтому alt пустой. */
export function ChipLogo({ chip, size = 32 }: { chip: string; size?: number }) {
  return (
    <img
      className="chip-logo"
      src={`${import.meta.env.BASE_URL}chips/${chipSlug(chip)}.webp`}
      width={size}
      height={size}
      alt=""
      loading="lazy"
      decoding="async"
      // нового чипа ещё нет в research/chips.tsv — просто без картинки
      onError={(e) => (e.currentTarget.hidden = true)}
    />
  );
}
