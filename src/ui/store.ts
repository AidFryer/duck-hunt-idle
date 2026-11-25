import { useEffect, useState } from 'preact/hooks';

/**
 * Minimal observable store. The sim publishes a fresh HUD snapshot a few
 * times per second; components re-render only when it changes.
 */
export class Store<T> {
  private listeners = new Set<(v: T) => void>();
  constructor(private value: T) {}

  get(): T {
    return this.value;
  }

  set(v: T): void {
    this.value = v;
    for (const fn of this.listeners) fn(v);
  }

  subscribe(fn: (v: T) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export function useStore<T>(store: Store<T>): T {
  const [v, setV] = useState(store.get());
  useEffect(() => store.subscribe(setV), [store]);
  return v;
}
