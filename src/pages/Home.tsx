import { useState } from 'react';
import type { Phone } from '../types.ts';
import { pairPath } from '../lib/phones.ts';
import { go } from '../router.ts';
import { Icon } from '../components/Icon.tsx';
import { PhoneSearch } from '../components/PhoneSearch.tsx';

/** Главный экран: один экран без прокрутки — заголовок и выбор двух телефонов. */
export function Home() {
  // оба слота в одном состоянии — быстрые выборы подряд не затирают друг друга
  const [[a, b], setSlots] = useState<[Phone | null, Phone | null]>([null, null]);

  const ready = !!a && !!b && a.id !== b.id;
  const submit = () => ready && go(pairPath(a!.id, b!.id));

  return (
    <div className="wrap home">
      <section className="home-hero">
        <p className="eyebrow">
          <Icon name="scale" size={15} />
          Сравнение смартфонов
        </p>
        <h1>
          Наноревью <span className="rainbow">хуйня</span>
        </h1>
        <p className="lead">Характеристики, замеры, автономность и камеры бок о бок. Меняйте сценарий — игры, фото, батарея — и смотрите, как меняется лидер.</p>

        <div className="card picker">
          <PhoneSearch label="Первый смартфон" accent="a" value={a} exclude={b?.id} onChange={(p) => setSlots(([, y]) => [p, y])} />
          <div className="picker-vs">VS</div>
          <PhoneSearch label="Второй смартфон" accent="b" value={b} exclude={a?.id} onChange={(p) => setSlots(([x]) => [x, p])} />
          <div className="picker-actions">
            <button type="button" className="btn btn-primary" disabled={!ready} onClick={submit}>
              Сравнить
              <Icon name="arrow" size={18} />
            </button>
          </div>
        </div>
      </section>

      <p className="home-note">Данные собраны из открытых источников, оценки считаются автоматически и не являются экспертным мнением.</p>
    </div>
  );
}
