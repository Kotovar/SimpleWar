import { useGameLoopStore } from '@entities/games';
import {
  BUILDINGS_CONFIG,
  type ParticipantId,
  type Position,
} from '@shared/config';
import { isHostile } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { getParticipantKnowledge } from '@entities/perceptions';

/** Клеток сверх дальности атаки, которые разведчик держит до угрозы. */
const DANGER_MARGIN = 2;

/**
 * Клетки, куда авторазведка не заходит: у видимых вражеских бойцов и у
 * известных вражеских зданий — дальность их атаки плюс запас. Рабочие
 * отпора не дают и не мешают.
 *
 * @returns Глубина опасности клетки, индекс `y * width + x`: `0` — безопасно,
 * больше — ближе к угрозе.
 */
export const getExplorationDanger = (
  actor: ParticipantId,
  width: number,
  height: number,
  visible: ArrayLike<number>,
) => {
  const sources: (Position & { range: number })[] = [];
  for (const unit of Object.values(useUnitsStore.getState().units)) {
    if (
      unit.role === 'military' &&
      isHostile(actor, unit.owner, useGameLoopStore.getState().participants) &&
      visible[unit.y * width + unit.x]
    )
      sources.push({ ...unit, range: unit.attackRange + DANGER_MARGIN });
  }
  for (const contact of Object.values(
    getParticipantKnowledge(actor)?.contacts ?? {},
  )) {
    if (
      contact.kind !== 'building' ||
      !isHostile(actor, contact.owner, useGameLoopStore.getState().participants)
    )
      continue;
    const config =
      BUILDINGS_CONFIG[contact.type as keyof typeof BUILDINGS_CONFIG];
    const attackRange =
      config && 'attackRange' in config ? config.attackRange : 0;
    sources.push({ ...contact, range: attackRange + DANGER_MARGIN });
  }
  const danger = new Uint8Array(width * height);
  for (const { x, y, range } of sources) {
    for (let dy = -range; dy <= range; dy++) {
      const span = range - Math.abs(dy);
      for (let dx = -span; dx <= span; dx++) {
        const cx = x + dx;
        const cy = y + dy;
        if (cx < 0 || cy < 0 || cx >= width || cy >= height) continue;
        const depth = span - Math.abs(dx) + 1;
        const key = cy * width + cx;
        danger[key] = Math.max(danger[key], depth);
      }
    }
  }
  return danger;
};
