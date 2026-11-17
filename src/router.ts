import { useEffect, useState } from 'react';

// hash-роутинг: работает на GitHub Pages без серверных редиректов
const read = () => {
  try {
    return decodeURIComponent(location.hash.replace(/^#/, '')) || '/';
  } catch {
    return '/';
  }
};

export function usePath(): string {
  const [path, setPath] = useState(read);
  useEffect(() => {
    const on = () => setPath(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}

export const go = (path: string) => {
  location.hash = path;
};

export const hrefOf = (path: string) => `#${path}`;
