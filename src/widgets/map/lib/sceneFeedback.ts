import {
  ATTACK_SFX,
  COMBAT_MUSIC_DISTANCE,
  DAMAGE_TYPE,
  DEATH_SFX,
  type Building,
  type Owner,
  type Sfx,
  type Unit,
} from '@shared/config';
import { isHostile } from '@shared/lib';
import type { SceneEvent } from './diffScene';
import type { Effect } from './drawEffects';

/**
 * Звук видимого изменения сцены.
 *
 * @param event - Изменение сцены.
 * @returns Эффект для воспроизведения.
 */
export const getEventSfx = (event: SceneEvent): Sfx => {
  switch (event.kind) {
    case 'move':
      return 'move';
    case 'damage':
      if (event.strike) return 'strike';
      return event.building ? 'hitBuilding' : 'hitUnit';
    case 'heal':
      return 'heal';
    case 'death':
      if (event.building) return 'destroy';
      return DEATH_SFX[event.type] ?? 'death';
    case 'spawn':
      return event.building ? 'build' : 'spawn';
    case 'attack':
      return (
        ATTACK_SFX[event.type] ??
        (DAMAGE_TYPE[event.type] === 'magic' ? 'magic' : 'attack')
      );
    case 'prepare':
      return 'strikePrepare';
    case 'threat':
      return 'threat';
  }
};

/**
 * Идёт ли бой для музыки: видимый военный юнит врага рядом со своими
 * объектами. Сцена содержит только видимое, поэтому скрытый враг не
 * включает музыку боя.
 *
 * @param units - Видимые юниты.
 * @param buildings - Видимые здания.
 * @param humanId - Смотрящий.
 */
export const isInCombat = (
  units: readonly Unit[],
  buildings: readonly Building[],
  humanId: Owner | null,
) => {
  if (!humanId) return false;
  const own = [...units, ...buildings].filter(
    entity => entity.owner === humanId,
  );
  return units.some(
    enemy =>
      enemy.role === 'military' &&
      isHostile(humanId, enemy.owner) &&
      own.some(
        entity =>
          Math.abs(entity.x - enemy.x) + Math.abs(entity.y - enemy.y) <=
          COMBAT_MUSIC_DISTANCE,
      ),
  );
};

/**
 * Эффект над клеткой по изменению сцены. Перемещение и выпад — смещения
 * модели, а не эффекты: для них `null`.
 *
 * @param event - Изменение сцены.
 * @param start - Время начала эффекта, мс.
 */
export const getEventEffect = (
  event: SceneEvent,
  start: number,
): Effect | null => {
  switch (event.kind) {
    case 'damage':
      return { x: event.x, y: event.y, damage: event.amount, start };
    case 'heal':
      return { x: event.x, y: event.y, healing: event.amount, start };
    case 'death':
      return { x: event.x, y: event.y, damage: event.hp, lethal: true, start };
    case 'spawn':
      return {
        x: event.x,
        y: event.y,
        spawn: event.owner,
        building: event.building,
        start,
      };
    case 'threat':
      return { x: event.x, y: event.y, signal: 'threat', start };
    default:
      return null;
  }
};
