import { useEffect, useRef, useState } from 'react';
import { usePath, hrefOf } from './router.ts';
import { fullName, parsePair } from './lib/phones.ts';
import { CHANGELOG } from './data/changelog.ts';
import { Home } from './pages/Home.tsx';
import { Compare } from './pages/Compare.tsx';
import { Rating, topOf } from './pages/Rating.tsx';
import { Starfield } from './components/Starfield.tsx';
import { Saturn } from './components/Saturn.tsx';
import { LogoMark, toNews } from './components/Brand.tsx';
import { Icon } from './components/Icon.tsx';

function Header({ rating }: { rating: boolean }) {
  const latest = CHANGELOG[0];
  return (
    <header className="hdr">
      <div className="hdr-in">
        <a href={hrefOf('/')} className="logo" aria-label="govnoreview — на главную">
          <LogoMark />
          <b>
            govno<span>review</span>
          </b>
        </a>
        <a href="#cl" className="hdr-ver" onClick={toNews} title="Что нового">
          v{latest.version}
        </a>
        <a href={hrefOf('/rating')} className={rating ? 'hdr-rate px hov is-on' : 'hdr-rate px hov'} aria-current={rating ? 'page' : undefined}>
          <Icon name="trophy" size={17} />
          Рейтинг
        </a>
        <a href="#cl" className="hdr-news hov" onClick={toNews} aria-label={`Что нового: ${latest.title}`}>
          <b className="hdr-new">
            <i aria-hidden="true" />
            Новое
          </b>
          <span>{latest.title}</span>
          <Icon name="arrow" size={14} />
        </a>
      </div>
    </header>
  );
}

export default function App() {
  const path = usePath();
  const isCompare = path.startsWith('/compare/');
  const isRating = path === '/rating' || path.startsWith('/rating/');
  const isHome = !isCompare && !isRating;
  const pair = isCompare ? parsePair(path.slice('/compare/'.length)) : null;
  const tab = isRating ? path.slice('/rating/'.length) : '';
  const top = isRating ? topOf(tab) : null;

  // старая или опечатанная вкладка рейтинга: адрес приводим к общему рейтингу, а не молча показываем его под чужой ссылкой
  useEffect(() => {
    if (tab && top && top.id !== tab) location.replace(hrefOf('/rating'));
  }, [tab, top]);

  // наверх — только при переходе на другую страницу; вкладки рейтинга меняют список на месте, без прыжка
  const page = isRating ? '/rating' : path;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  useEffect(() => {
    document.title = pair
      ? `${fullName(pair[0])} vs ${fullName(pair[1])} — сравнение · govnoreview`
      : top
        ? `${top.title} — рейтинг смартфонов · govnoreview`
        : 'govnoreview — сравнение смартфонов';
  }, [pair, top]);

  // заставка: сначала из символов собирается Сатурн, потом появляется сайт. Запасной таймер — если холст не дорисует
  const [ready, setReady] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 4000);
    return () => clearTimeout(id);
  }, []);
  // первая страница выходит мозаикой (.intro-in), следующие — обычным всплытием; класс не меняется у уже
  // смонтированной страницы, иначе её анимация запустилась бы заново
  const section = isHome ? 'home' : isRating ? 'rating' : 'compare';
  const firstSection = useRef<string | null>(null);
  if (ready && firstSection.current === null) firstSection.current = section;
  else if (firstSection.current && firstSection.current !== section) firstSection.current = '';

  return (
    <>
      <Starfield />
      <Saturn onReady={() => setReady(true)} />
      {ready && (
        <>
          <Header rating={isRating} />
          {/* ключ по разделу: при переходе главная ↔ рейтинг ↔ сравнение страница заново всплывает */}
          <main key={section} className={section === firstSection.current ? 'page intro-in' : 'page'}>
            {isHome ? (
              <Home />
            ) : top ? (
              <Rating key={top.id} slug={top.id} />
            ) : pair ? (
              <Compare a={pair[0]} b={pair[1]} />
            ) : (
              <div className="wrap lost">
                <h1>Такой пары у нас нет</h1>
                <p>Возможно, ссылка устарела или одной из моделей нет в каталоге.</p>
                <a className="btn btn-primary" href={hrefOf('/')}>
                  На главную
                </a>
              </div>
            )}
          </main>
          {!isHome && (
            <footer className="ftr">
              <div className="wrap">
                <p>
                  <b>govnoreview</b> — личный проект для сравнения смартфонов. Характеристики и замеры взяты с сайта GSMArena, оценки камер — с DxOMARK, по состоянию на ноябрь 2026.
                </p>
                <p>Оценки и индекс «цена/качество» считаются автоматически по этим данным и не являются экспертным мнением. Проект не связан с производителями и сайтами-источниками. Изображения устройств принадлежат их производителям. Спина iPhone 2G — по{' '}
                  <a href="https://commons.wikimedia.org/wiki/File:Original_iPhone_rear.jpg">фото Robert Scoble</a>,{' '}
                  <a href="https://creativecommons.org/licenses/by/2.0/">CC BY 2.0</a>.
                </p>
              </div>
            </footer>
          )}
        </>
      )}
    </>
  );
}
