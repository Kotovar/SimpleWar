import type { Owner } from '@shared/config';

/** Отношение одного участника к другому. */
export type Relation = 'own' | 'hostile';

/**
 * Единственное место проверки отношений. Пока все разные участники враждебны;
 * союз появится здесь, а право приказа по-прежнему проверяется владением.
 *
 * @param from - Участник, с чьей точки зрения смотрим.
 * @param to - Владелец объекта.
 * @returns Отношение `from` к `to`.
 */
export const getRelation = (from: Owner, to: Owner): Relation =>
  from === to ? 'own' : 'hostile';

/**
 * Проверяет, враждебен ли владелец объекта участнику.
 *
 * @param from - Участник, с чьей точки зрения смотрим.
 * @param to - Владелец объекта.
 * @returns `true`, если объект вражеский.
 */
export const isHostile = (from: Owner, to: Owner) =>
  getRelation(from, to) === 'hostile';
