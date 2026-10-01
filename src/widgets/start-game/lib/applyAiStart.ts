import {
  AI_DIFFICULTY,
  START_RESOURCES,
  type Participant,
} from '@shared/config';
import { useEconomyStore } from '@entities/economies';

/**
 * Сложность S17a: стартовые запасы каждого ИИ по его пресету — обычный
 * запас плюс прибавка пресета, не меньше нуля. Вызывается один раз при
 * создании партии; человек и неизвестный пресет получают обычный старт.
 *
 * @param participants - Участники партии.
 */
export const applyAiStart = (participants: Participant[]) => {
  const resources = { ...useEconomyStore.getState().resources };
  for (const { id, controller, ai } of participants) {
    const bonus =
      controller === 'ai' && ai
        ? AI_DIFFICULTY[ai.difficulty]?.stockBonus
        : null;
    const base = START_RESOURCES[id];
    resources[id] = bonus
      ? {
          gold: Math.max(0, base.gold + bonus.gold),
          wood: Math.max(0, base.wood + bonus.wood),
        }
      : { ...base };
  }
  useEconomyStore.setState({ resources });
};
