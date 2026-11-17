import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/manrope';
import '@fontsource-variable/unbounded';
import './styles/base.css';
import './styles/art.css';
import './styles/home.css';
import './styles/compare.css';
import App from './App.tsx';

// Рисуем интерфейс, когда шрифты уже загружены (но ждём не дольше 1,2 с). Иначе текст сначала набирается
// запасным шрифтом, а потом перестраивается: широкий Unbounded переносит названия на вторую строку, и всё
// ниже «уезжает» на 15–20 px. Загрузку шрифтов ускоряют <link rel="preload"> в index.html.
const text = 'Аа Aa 0123';
const fontsReady = Promise.allSettled([document.fonts.load('800 1em "Unbounded Variable"', text), document.fonts.load('500 1em "Manrope Variable"', text)]);

Promise.race([fontsReady, new Promise((resolve) => setTimeout(resolve, 1200))]).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
