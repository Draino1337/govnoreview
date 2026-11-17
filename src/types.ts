export type Row = [sec: string, sub: string, label: string, value: string];
export type CamKind = 'tri' | 'duo' | 'col' | 'ring' | 'plate' | 'bar';

/** Нарисованная задняя панель — запасной вариант, когда нет фото. */
export interface Look {
  body: [string, string];
  cam: CamKind;
}

export interface Phone {
  id: string;
  brand: string;
  name: string;
  /** снимки в public/phones (<id>-front.webp, <id>-back.webp): отношение ширины к высоте вырезки, 0 — снимка нет */
  photo: { front: number; back: number };
  tier: string;
  released: string; // YYYY-MM
  price: number; // USD на момент выхода
  look: Look;
  rows: Row[];
  bench: Record<string, string>;
}
