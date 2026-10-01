import type { Effect } from '@widgets/map/lib';

type Listener = (effect: Effect) => void;

const listeners = new Set<Listener>();

/**
 * Передаёт слою объектов эффект не из сравнения сцены, например отказ
 * приказа по клику. Без подписанного слоя эффект пропадает.
 */
export const pushMapEffect = (effect: Effect) =>
  listeners.forEach(listener => listener(effect));

/** Подписывает слой объектов на внешние эффекты; возвращает отписку. */
export const onMapEffect = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
