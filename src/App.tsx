import { useEffect } from 'react';
import { usePath, hrefOf } from './router.ts';
import { fullName, parsePair } from './lib/phones.ts';
import { useTheme } from './lib/hooks.ts';
import { Icon } from './components/Icon.tsx';
import { Home } from './pages/Home.tsx';
import { Compare } from './pages/Compare.tsx';

function Header({ theme, onTheme }: { theme: string; onTheme: () => void }) {
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
  const isHome = !isCompare;
  const pair = isCompare ? parsePair(path.slice('/compare/'.length)) : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  useEffect(() => {
    document.title = pair ? `${fullName(pair[0])} vs ${fullName(pair[1])} — сравнение · govnoreview` : 'govnoreview — сравнение смартфонов';
  }, [pair]);

  return (
    <>
      <Header theme={theme} onTheme={toggleTheme} />
      <main>
        {isHome ? (
          <Home />
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
              <b>govnoreview</b> — личный проект для сравнения смартфонов. Характеристики и замеры собраны из открытых источников (в первую очередь со страниц сравнений NanoReview, а также Geekbench, AnTuTu, 3DMark, DxOMark) по состоянию на ноябрь 2026.
            </p>
            <p>Оценки и индекс «цена/качество» считаются автоматически по этим данным и не являются экспертным мнением. Проект не связан с производителями и сайтами-источниками. Изображения устройств принадлежат их производителям; снимки взяты с Kimovil, магазинов Samsung и Apple.</p>
          </div>
        </footer>
      )}
    </>
  );
}
