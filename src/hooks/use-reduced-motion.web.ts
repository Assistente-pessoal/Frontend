import { useSyncExternalStore } from 'react';

let mediaQuery: MediaQueryList | undefined;

function getMediaQuery(): MediaQueryList | undefined {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
  mediaQuery ??= window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery;
}

function subscribe(onChange: () => void): () => void {
  const query = getMediaQuery();
  if (!query) return () => undefined;
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }
  query.addListener(onChange);
  return () => query.removeListener(onChange);
}

const getSnapshot = () => getMediaQuery()?.matches ?? true;
const getServerSnapshot = () => true;

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
