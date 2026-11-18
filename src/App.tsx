import { useEffect } from 'react';
import { usePath, hrefOf } from './router.ts';
import { fullName, parsePair } from './lib/phones.ts';
import { useTheme } from './lib/hooks.ts';
import { Icon } from './components/Icon.tsx';
import { Home } from './pages/Home.tsx';
import { Compare } from './pages/Compare.tsx';
import { Rating, topOf } from './pages/Rating.tsx';

function Header({ theme, onTheme, rating }: { theme: string; onTheme: () => void; rating: boolean }) {
  return (
    <header className="hdr">
      <div className="wrap">
        <a href={hrefOf('/')} className="logo" aria-label="govnoreview — на главную">
          <span className="logo-mark" aria-hidden="true">
            <i />
            <i />
          </span>
          govno<span>review</span>
        </a>
        <nav className="hdr-nav" aria-label="Разделы">
          <a href={hrefOf('/rating')} className={rating ? 'is-on' : undefined} aria-current={rating ? 'page' : undefined}>
            <Icon name="trophy" size={17} />
            Рейтинг
          </a>
        </nav>
        <button type="button" className="theme" onClick={onTheme} aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'} title="Сменить тему">
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
        </button>
      </div>
    </header>
  );
}

export default function App() {
  const path = usePath();
  const [theme, toggleTheme] = useTheme();
  const isCompare = path.startsWith('/compare/');
  const isRating = path === '/rating' || path.startsWith('/rating/');
  const isHome = !isCompare && !isRating;
  const pair = isCompare ? parsePair(path.slice('/compare/'.length)) : null;
  const top = isRating ? topOf(path.slice('/rating/'.length)) : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  useEffect(() => {
    document.title = pair
      ? `${fullName(pair[0])} vs ${fullName(pair[1])} — сравнение · govnoreview`
      : top
        ? `${top.title} — рейтинг смартфонов · govnoreview`
        : 'govnoreview — сравнение смартфонов';
  }, [pair, top]);

  return (
    <>
      <Header theme={theme} onTheme={toggleTheme} rating={isRating} />
      <main>
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
  );
}
