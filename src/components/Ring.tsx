import { useTween } from '../lib/hooks.ts';
import { Icon } from './Icon.tsx';

interface Props {
  value: number;
  color: string; // css-переменная: 'var(--a)'
  size?: number;
  caption?: string;
  leader?: boolean;
}

export function Ring({ value, color, size = 96, caption = 'из 100', leader = false }: Props) {
  const v = useTween(value, 900);
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className={`ring${leader ? ' is-leader' : ''}`} style={{ width: size, height: size, fontSize: (size / 96) * 16, color }} role="img" aria-label={`${value} — ${caption}`}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r={r} className="ring-track" />
        <circle cx="50" cy="50" r={r} className="ring-bar" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} transform="rotate(-90 50 50)" />
      </svg>
      <div className="ring-text">
        <b>{Math.round(v)}</b>
        <small>{caption}</small>
      </div>
      {leader && (
        <span className="ring-crown" title="Лидер в выбранном сценарии">
          <Icon name="trophy" size={14} />
        </span>
      )}
    </div>
  );
}
