import type { Position, Unit } from '@shared/config';

/**
 * Публичные отметки подготовленных ударов: только клетки целей, без
 * позиции, типа и HP орудий. Видны всем участникам независимо от тумана.
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
