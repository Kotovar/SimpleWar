import type { Owner, Participant } from '@shared/config';

/** Отношение одного участника к другому. */
export type Relation = 'own' | 'allied' | 'hostile';

/**
 * Постоянные команды задают союз; право приказа остаётся у владельца.
 *
 * @param from - Участник, с чьей точки зрения смотрим.
 * @param to - Владелец объекта.
 * @returns Отношение `from` к `to`.
 */
export const getRelation = (
  from: Owner,
  to: Owner,
  participants: readonly Pick<Participant, 'id' | 'team'>[] = [],
): Relation => {
  if (from === to) return 'own';
  const team = participants.find(p => p.id === from)?.team;
  return team !== undefined &&
    participants.some(p => p.id === to && p.team === team)
    ? 'allied'
    : 'hostile';
};

/**
 * Проверяет, враждебен ли владелец объекта участнику.
 *
 * @param from - Участник, с чьей точки зрения смотрим.
 * @param to - Владелец объекта.
 * @returns `true`, если объект вражеский.
 */
export const isHostile = (
  from: Owner,
  to: Owner,
  participants: readonly Pick<Participant, 'id' | 'team'>[] = [],
) => getRelation(from, to, participants) === 'hostile';
