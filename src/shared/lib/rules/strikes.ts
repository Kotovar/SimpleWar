import type { Position, Unit } from '@shared/config';

/**
 * Все отметки подготовленных ударов мира: только клетки целей, без
 * позиции, типа и HP орудий. Для полного обзора отладки; участник видит
 * отметки из своих знаний (Скрытая наводка их прячет).
 *
 * @param units - Все юниты мира.
 */
export const collectStrikeMarks = (units: Iterable<Unit>): Position[] => {
  const marks: Position[] = [];
  for (const unit of units) {
    if (unit.role === 'military' && unit.preparedStrike) {
      marks.push({ ...unit.preparedStrike });
    }
  }
  return marks;
};
