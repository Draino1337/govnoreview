import { go } from '../router.ts';

/** Пиксельный знак: два телефона рядом. */
export function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
      <path fill="currentColor" d="M2 3h5v10H2zM9 3h5v10H9z" />
      <path fill="var(--bg)" d="M4 5h1v6H4zM11 5h1v6h-1z" />
    </svg>
  );
}

/** Прокрутка к ленте «Что нового» на главной; с других страниц сначала переходим на главную. */
export function toNews(e?: { preventDefault: () => void }) {
  e?.preventDefault();
  const scroll = () => document.getElementById('cl')?.scrollIntoView({ behavior: 'smooth' });
  if (document.getElementById('cl')) scroll();
  else {
    go('/');
    setTimeout(scroll, 120);
  }
}
