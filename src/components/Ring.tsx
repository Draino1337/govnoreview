import { useTween } from '../lib/hooks.ts';
import { Icon } from './Icon.tsx';

interface Props {
  value: number;
  color: string; // css-переменная: 'var(--a)'
  size?: number;
  caption?: string;
  leader?: boolean;
}

/** Оценка в пиксельной плашке: число из квадратиков и шкала из десяти делений, которая набирается вместе с числом. */
export function Ring({ value, color, size = 96, caption = 'из 100', leader = false }: Props) {
  const v = useTween(value, 900);
  const lit = Math.round(v / 10);
  return (
    <div className={`ring px px-well${leader ? ' is-leader' : ''}`} style={{ width: size, height: size, fontSize: (size / 96) * 16, color }} role="img" aria-label={`${value} — ${caption}`}>
      <div className="ring-text">
        <b className="dither dither-sm">{Math.round(v)}</b>
        <small>{caption}</small>
      </div>
      <i className="ring-seg" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <s key={i} className={i < lit ? 'is-on' : undefined} />
        ))}
      </i>
      {leader && (
        <span className="ring-crown" title="Лидер сравнения">
          <Icon name="trophy" size={14} />
        </span>
      )}
    </div>
  );
}
