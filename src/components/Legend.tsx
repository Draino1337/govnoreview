import type { Phone } from '../types.ts';
import { shortName } from '../lib/phones.ts';

export function Legend({ a, b }: { a: Phone; b: Phone }) {
  return (
    <div className="legend">
      <span className="is-a">{shortName(a)}</span>
      <span className="is-b">{shortName(b)}</span>
    </div>
  );
}
