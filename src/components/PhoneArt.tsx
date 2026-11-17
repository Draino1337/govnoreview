import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { CamKind, Phone } from '../types.ts';
import { Icon } from './Icon.tsx';

function Camera({ kind, lenses }: { kind: CamKind; lenses: number }) {
  const n = Math.max(2, Math.min(4, lenses));
  if (kind === 'tri')
    return (
      <div className="cam cam-tri">
        <i className="lens" />
        <i className="lens" />
        <i className="lens" />
        <b className="flash" />
      </div>
    );
  if (kind === 'duo')
    return (
      <div className="cam cam-duo">
        <i className="lens" />
        <i className="lens" />
      </div>
    );
  if (kind === 'ring')
    return (
      <div className="cam cam-ring">
        <i className="lens" />
        <i className="lens" />
        <i className="lens" />
      </div>
    );
  if (kind === 'bar')
    return (
      <div className="cam cam-bar">
        <i className="lens" />
        <i className="lens" />
        <i className="lens" />
      </div>
    );
  if (kind === 'plate')
    return (
      <div className="cam cam-plate">
        {Array.from({ length: n }, (_, i) => (
          <i className="lens" key={i} />
        ))}
        <b className="flash" />
      </div>
    );
  return (
    <div className="cam cam-col">
      {Array.from({ length: n }, (_, i) => (
        <i className="lens" key={i} />
      ))}
    </div>
  );
}

interface Props {
  phone: Phone;
  lenses?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

/** Нарисованный телефон: наклоняется за курсором, по клику разворачивается задней панелью. */
export function PhoneArt({ phone, lenses = 3, size = 'md', interactive = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [back, setBack] = useState(false);
  const { body, wall, cam } = phone.look;

  const move = (e: PointerEvent) => {
    if (!interactive || e.pointerType === 'touch') return;
    const r = ref.current!.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current!.style.setProperty('--rx', `${(-y * 14).toFixed(1)}deg`);
    ref.current!.style.setProperty('--ry', `${(x * 18).toFixed(1)}deg`);
  };
  const leave = () => {
    ref.current?.style.setProperty('--rx', '0deg');
    ref.current?.style.setProperty('--ry', '0deg');
  };

  const style = { '--b0': body[0], '--b1': body[1], '--w0': wall[0], '--w1': wall[1] } as CSSProperties;
  const inner = (
    <div className={`pa-body${back ? ' is-back' : ''}`}>
      <div className="pa-face pa-front">
        <div className="pa-screen">
          <i className="pa-hole" />
          <div className="pa-clock">12:30</div>
          <div className="pa-date">{phone.brand}</div>
        </div>
      </div>
      <div className="pa-face pa-rear">
        <Camera kind={cam} lenses={lenses} />
        <span className="pa-brand">{phone.brand}</span>
      </div>
    </div>
  );

  if (!interactive)
    return (
      <div className={`pa pa-${size}`} style={style} aria-hidden="true">
        {inner}
      </div>
    );

  return (
    <button
      type="button"
      ref={ref as never}
      className={`pa pa-${size} pa-interactive`}
      style={style}
      onPointerMove={move}
      onPointerLeave={leave}
      onClick={() => setBack((b) => !b)}
      aria-label={back ? 'Показать экран' : 'Показать заднюю панель'}
      title={back ? 'Показать экран' : 'Повернуть'}
    >
      {inner}
      <span className="pa-hint">
        <Icon name="flip" size={14} />
      </span>
    </button>
  );
}
