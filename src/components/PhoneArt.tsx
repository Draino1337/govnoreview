import { useRef, type CSSProperties, type PointerEvent } from 'react';
import type { CamKind, Phone } from '../types.ts';

export type View = 'front' | 'back';

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
  /** наклон за курсором и переворот; нужен onFlip */
  interactive?: boolean;
  view?: View;
  onFlip?: () => void;
}

/**
 * Телефон двумя видами — спереди и сзади (вырезки с прозрачным фоном из public/phones).
 * Мелкие миниатюры показывают один вид, крупная карточка переворачивается.
 * Если снимков нет — рисуется запасная задняя панель.
 */
export function PhoneArt({ phone, lenses = 3, size = 'md', interactive = false, view = 'front', onFlip }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { front, back } = phone.photo;
  const src = (v: View) => `${import.meta.env.BASE_URL}phones/${phone.id}-${v}.webp`;

  const move = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const r = ref.current!.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current!.style.setProperty('--rx', `${(-y * 10).toFixed(1)}deg`);
    ref.current!.style.setProperty('--ry', `${(x * 14).toFixed(1)}deg`);
  };
  const leave = () => {
    ref.current?.style.setProperty('--rx', '0deg');
    ref.current?.style.setProperty('--ry', '0deg');
  };

  let body;
  if (front && back && interactive) {
    body = (
      <div className={`pa-flip${view === 'front' ? ' is-front' : ''}`}>
        <div className="pa-face pa-face-back">
          <img className="pa-photo" src={src('back')} alt="" draggable={false} decoding="async" />
        </div>
        <div className="pa-face pa-face-front">
          <img className="pa-photo" src={src('front')} alt="" draggable={false} decoding="async" />
        </div>
      </div>
    );
  } else if (front || back) {
    const v: View = view === 'front' ? (front ? 'front' : 'back') : back ? 'back' : 'front';
    body = <img className="pa-photo" src={src(v)} alt="" draggable={false} loading="lazy" decoding="async" />;
  } else {
    body = (
      <div className="pa-rear">
        <Camera kind={phone.look.cam} lenses={lenses} />
        <span className="pa-brand">{phone.brand}</span>
      </div>
    );
  }

  const style = { '--b0': phone.look.body[0], '--b1': phone.look.body[1] } as CSSProperties;
  return (
    <div
      ref={ref}
      className={`pa pa-${size}${front || back ? ' has-photo' : ''}${interactive && onFlip ? ' is-flippable' : ''}`}
      style={style}
      aria-hidden="true"
      onPointerMove={interactive ? move : undefined}
      onPointerLeave={interactive ? leave : undefined}
      onClick={interactive ? onFlip : undefined}
    >
      <div className="pa-body">{body}</div>
    </div>
  );
}
