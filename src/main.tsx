import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './styles/base.css';
import './styles/pixel.css';
import './styles/art.css';
import './styles/home.css';
import './styles/compare.css';
import './styles/rating.css';
import { initPixel } from './lib/pixel.ts';
import App from './App.tsx';

initPixel();

// Рисуем интерфейс, когда шрифт уже загружен (но ждём не дольше 1,2 с). Иначе текст сначала набирается
// запасным шрифтом, а потом перестраивается, и всё ниже «уезжает». Загрузку ускоряют <link rel="preload"> в index.html.
const text = 'Аа Aa 0123';
const fontsReady = Promise.allSettled([document.fonts.load('300 1em "Inter Variable"', text), document.fonts.load('700 1em "Inter Variable"', text)]);

Promise.race([fontsReady, new Promise((resolve) => setTimeout(resolve, 1200))]).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
