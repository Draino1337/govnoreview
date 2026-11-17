export type Row = [sec: string, sub: string, label: string, value: string];
export type CamKind = 'tri' | 'duo' | 'col' | 'ring' | 'plate' | 'bar';

export interface Look {
  body: [string, string];
  wall: [string, string];
  cam: CamKind;
}

export interface Phone {
  id: string;
  brand: string;
  name: string;
  tier: string;
  released: string; // YYYY-MM
  price: number; // USD на момент выхода
  look: Look;
  rows: Row[];
  bench: Record<string, string>;
}
