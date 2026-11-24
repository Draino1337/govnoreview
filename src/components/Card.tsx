import type { ReactNode } from 'react';
import { Icon } from './Icon.tsx';

interface Props {
  id?: string;
  icon: string;
  title: string;
  desc?: string;
  className?: string;
  children: ReactNode;
}

/** Секция-карточка. Без анимаций при прокрутке: всё стоит на месте сразу, характеристики листаются спокойно. */
export function Card({ id, icon, title, desc, className = '', children }: Props) {
  return (
    <section id={id} className={`card sec ${className}`}>
      <header className="card-head">
        <span className="card-ico">
          <Icon name={icon} size={22} />
        </span>
        <div>
          <h2>{title}</h2>
          {desc && <p>{desc}</p>}
        </div>
      </header>
      <div className="card-body">{children}</div>
    </section>
  );
}
