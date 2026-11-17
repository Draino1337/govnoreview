import { useRef, type CSSProperties, type PointerEvent } from 'react';
import type { CamKind, Phone } from '../types.ts';

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
  /** наклон за курсором */
  interactive?: boolean;
}

/**
 * Телефон одним кадром: спина лежит поверх экрана и закрывает его на четверть (вырезка с прозрачным фоном
 * из public/phones, см. scripts/combine.mjs). Если кадра нет — рисуется запасная задняя панель.
 */
export function PhoneArt({ phone, lenses = 3, size = 'md', interactive = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const ratio = phone.photo; // ширина/высота кадра: место под него занято ещё до загрузки картинки

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

  const body = ratio ? (
    <img className="pa-photo" src={`${import.meta.env.BASE_URL}phones/${phone.id}.webp`} alt="" draggable={false} decoding="async" loading={interactive ? undefined : 'lazy'} />
  ) : (
    <div className="pa-rear">
      <Camera kind={phone.look.cam} lenses={lenses} />
      <span className="pa-brand">{phone.brand}</span>
    </div>
  );

  const style = { '--b0': phone.look.body[0], '--b1': phone.look.body[1], ...(ratio && { '--ar': ratio }) } as CSSProperties;
  return (
    <div ref={ref} className={`pa pa-${size}${ratio ? ' has-photo' : ''}`} style={style} aria-hidden="true" onPointerMove={interactive ? move : undefined} onPointerLeave={interactive ? leave : undefined}>
      <div className="pa-body">{body}</div>
    </div>
  );
}
