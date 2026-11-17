import type { Phone } from '../../types.ts';
import type { Metrics } from '../../lib/metrics.ts';
import { num } from '../../lib/metrics.ts';
import { BENCH_GROUPS, type SpecSection } from '../../lib/specs.ts';
import { fmtHours } from '../../lib/insights.ts';
import { Card } from '../../components/Card.tsx';
import { DuelBar } from '../../components/DuelBar.tsx';
import { Icon } from '../../components/Icon.tsx';
import { Legend } from '../../components/Legend.tsx';
import { shortName } from '../../lib/phones.ts';
import { SpecRows } from './Specs.tsx';

interface P {
  a: Phone;
  b: Phone;
  ma: Metrics;
  mb: Metrics;
}

export function BenchCard({ a, b }: P) {
  return (
    <Card id="bench" icon="bolt" title="Бенчмарки" desc="Синтетические тесты процессора и графики. Больше — лучше.">
      <Legend a={a} b={b} />
      <div className="bench-grid">
        {BENCH_GROUPS.map((g) => {
          const items = g.items.filter(([k]) => a.bench[k] || b.bench[k]);
          if (!items.length) return null;
          return (
            <div className="bench-col" key={g.title}>
              <h3 className="sub-h">
                <Icon name={g.icon} size={18} />
                {g.title}
              </h3>
              {items.map(([k, label]) => (
                <DuelBar key={k} label={label} a={num(a.bench[k])} b={num(b.bench[k])} />
              ))}
            </div>
          );
        })}
      </div>
      <p className="foot">«н/д» — для этой модели нет опубликованного результата.</p>
    </Card>
  );
}

export function BatteryCard({ a, b, ma, mb }: P) {
  const est = ma.enduranceEst || mb.enduranceEst;
  const h = (n: number) => `${fmtHours(n)} ч`;
  return (
    <Card id="battery" icon="battery" title="Автономность и зарядка" desc="Замеры времени работы, ёмкость и скорость зарядки">
      <Legend a={a} b={b} />
      <div className="bench-grid">
        <div className="bench-col">
          <h3 className="sub-h">
            <Icon name="battery" size={18} />
            Время работы
          </h3>
          <DuelBar label="Общая автономность" sub={est ? 'у части моделей — оценка по ёмкости' : undefined} a={ma.endurance} b={mb.endurance} fmt={h} />
          <DuelBar label="Веб-серфинг" a={ma.web} b={mb.web} fmt={h} />
          <DuelBar label="Просмотр видео" a={ma.video} b={mb.video} fmt={h} />
          <DuelBar label="Игры" a={ma.game} b={mb.game} fmt={h} />
        </div>
        <div className="bench-col">
          <h3 className="sub-h">
            <Icon name="bolt" size={18} />
            Ёмкость и зарядка
          </h3>
          <DuelBar label="Ёмкость аккумулятора" a={ma.bat} b={mb.bat} unit=" мАч" />
          <DuelBar label="Мощность зарядки" a={ma.charge} b={mb.charge} unit=" Вт" />
          <DuelBar label="Беспроводная зарядка" a={ma.wireless || undefined} b={mb.wireless || undefined} unit=" Вт" />
          <DuelBar label="Полная зарядка" sub="чем быстрее, тем лучше" a={ma.fullMin} b={mb.fullMin} low unit=" мин" />
        </div>
      </div>
    </Card>
  );
}

export function CameraCard({ a, b, ma, mb, sections }: P & { sections: SpecSection[] }) {
  const main = sections.find((s) => s.title === 'Основная камера');
  const front = sections.find((s) => s.title === 'Фронтальная камера');
  const lensGroups = [...(main?.groups.filter((g) => g.caption) ?? []), ...(front?.groups.map((g) => ({ ...g, caption: 'Фронтальная камера' })) ?? [])];
  const dxo = ['Качество фото', 'Качество видео', 'Итоговая оценка камеры'].filter((k) => a.bench[k] || b.bench[k]);

  return (
    <Card id="camera" icon="camera" title="Камеры" desc="Сенсор, оптика и замеры DxOMark, если они есть">
      <Legend a={a} b={b} />
      <div className="bench-grid">
        <div className="bench-col">
          <h3 className="sub-h">
            <Icon name="camera" size={18} />
            Основной модуль
          </h3>
          <DuelBar label="Размер сенсора" a={ma.sensor} b={mb.sensor} fmt={(n) => n.toFixed(2)} unit="″" />
          <DuelBar label="Разрешение" a={ma.mp} b={mb.mp} unit=" Мп" />
          <DuelBar label="Оптический зум" a={ma.zoom || undefined} b={mb.zoom || undefined} fmt={(n) => String(n)} unit="x" />
          <DuelBar label="Фронтальная камера" a={ma.frontMp} b={mb.frontMp} unit=" Мп" />
        </div>
        <div className="bench-col">
          <h3 className="sub-h">
            <Icon name="eye" size={18} />
            DxOMark
          </h3>
          {dxo.length ? (
            dxo.map((k) => <DuelBar key={k} label={k} a={num(a.bench[k])} b={num(b.bench[k])} max={200} />)
          ) : (
            <p className="empty">Для этих моделей замеров DxOMark нет.</p>
          )}
        </div>
      </div>

      {lensGroups.length > 0 && (
        <div className="lens-grid">
          {lensGroups.map((g) => (
            <div className="lens-card" key={g.caption}>
              <div className="lens-head">
                <span className="spec-cap">{g.caption}</span>
                <b className="is-a">{shortName(a)}</b>
                <b className="is-b">{shortName(b)}</b>
              </div>
              <SpecRows group={g} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
