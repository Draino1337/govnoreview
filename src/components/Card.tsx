import type { ReactNode } from 'react';
import { useInView } from '../lib/hooks.ts';
import { Icon } from './Icon.tsx';

interface Props {
  id?: string;
  icon: string;
  title: string;
  desc?: string;
  className?: string;
  children: ReactNode;
}

/** Секция-карточка. Класс .in включается при первом появлении в окне — от него запускаются анимации полосок. */
export function Card({ id, icon, title, desc, className = '', children }: Props) {
  const [ref, seen] = useInView<HTMLElement>(0.06);
  return (
    <section id={id} ref={ref} className={`card sec${seen ? ' in' : ''} ${className}`}>
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
