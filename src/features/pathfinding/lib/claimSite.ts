import {
  OBELISK_REVEAL_RADIUS,
  UNITS_CONFIG,
  type ParticipantId,
  type Position,
} from '@shared/config';
import { gameEvents, isHostile } from '@shared/lib';
import { useSitesStore } from '@entities/sites';
import { useUnitsStore } from '@entities/units';
import { useMapStore } from '@entities/maps';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import {
  ROAD_BIT,
  TERRAIN_CODES,
  useKnowledgeStore,
} from '@entities/perceptions';
import { isCellOccupied } from './isCellOccupied';

const revealTerrain = (owner: ParticipantId, center: Position) => {
  const { grid } = useMapStore.getState();
  const { participants } = useGameLoopStore.getState();
  useKnowledgeStore.setState(state => {
    const byParticipant = { ...state.byParticipant };
    for (const { id } of participants) {
      const k = byParticipant[id];
      if (!k || isHostile(owner, id, participants)) continue;
      const terrain = k.terrain.slice();
      for (
        let y = Math.max(0, center.y - OBELISK_REVEAL_RADIUS);
        y <= Math.min(grid.length - 1, center.y + OBELISK_REVEAL_RADIUS);
        y++
      ) {
        const span = OBELISK_REVEAL_RADIUS - Math.abs(y - center.y);
        for (
          let x = Math.max(0, center.x - span);
          x <= Math.min(k.width - 1, center.x + span);
          x++
        ) {
          const cell = grid[y][x];
          terrain[y * k.width + x] =
            (TERRAIN_CODES.indexOf(cell.type) + 1) | (cell.road ? ROAD_BIT : 0);
        }
      }
      byParticipant[id] = { ...k, terrain };
    }
    return { byParticipant };
  });
};

/** Сбор только на оплаченном участке движения; оставшийся путь не занимаем новым рабочим, если есть выбор. */
export const claimSite = (
  unitId: string,
  position: Position,
  remainingPath: readonly Position[],
) => {
  const unit = useUnitsStore.getState().units[unitId];
  if (unit?.type !== 'scout') return;
  const site = useSitesStore.getState().getSiteAt(position.x, position.y);
  if (!site || site.type === 'camp' || site.type === 'ruins') return;
  const owner = unit.owner;
  if (site.type === 'refugees') {
    const { occupied, max } = useEconomyStore.getState().populationCap[owner];
    if (occupied + UNITS_CONFIG.worker.requiresLimit > max) {
      gameEvents.emit({
        type: 'SITE_BLOCKED',
        owner,
        site,
        reason: 'population',
      });
      return;
    }
    const { getCell } = useMapStore.getState();
    const candidates: Position[] = [];
    for (let y = site.y - 1; y <= site.y + 1; y++) {
      for (let x = site.x - 1; x <= site.x + 1; x++) {
        if (
          (x !== site.x || y !== site.y) &&
          getCell(x, y)?.type === 'grass' &&
          !isCellOccupied(x, y)
        )
          candidates.push({ x, y });
      }
    }
    const onRoute = (p: Position) =>
      remainingPath.some(c => c.x === p.x && c.y === p.y);
    candidates.sort((a, b) => Number(onRoute(a)) - Number(onRoute(b)));
    const cell = candidates[0];
    if (!cell) {
      gameEvents.emit({
        type: 'SITE_BLOCKED',
        owner,
        site,
        reason: 'occupied',
      });
      return;
    }
    if (!useUnitsStore.getState().spawnUnit('worker', cell.x, cell.y, owner))
      return;
  }
  if (site.type === 'cache')
    useEconomyStore
      .getState()
      .addResources(owner, { [site.resource]: site.amount });
  useSitesStore.getState().removeSite(site.id);
  if (site.type === 'obelisk') revealTerrain(owner, site);
  gameEvents.emit({ type: 'SITE_CLAIMED', owner, site });
};
