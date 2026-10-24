import {
  UNITS_CONFIG,
  type ParticipantId,
  type SiteType,
} from '@shared/config';
import { gameEvents } from '@shared/lib';
import { useGameLoopStore } from '@entities/games';

/** Факты о находках и найме; одинаковый сбор до и после изменения ИИ. */
export const trackSites = () => {
  const claims: {
    owner: ParticipantId;
    unitId: string;
    turn: number;
    type: SiteType;
    gold: number;
    wood: number;
  }[] = [];
  const scouts: { owner: ParticipantId; unitId: string; turn: number }[] = [];
  const outposts: {
    owner: ParticipantId;
    turn: number;
    x: number;
    y: number;
  }[] = [];
  const off = gameEvents.subscribe(event => {
    const turn = useGameLoopStore.getState().currentTurn;
    if (event.type === 'SITE_CLAIMED') {
      const { site, owner } = event;
      const reward =
        site.type === 'cache'
          ? {
              gold: site.resource === 'gold' ? site.amount : 0,
              wood: site.resource === 'wood' ? site.amount : 0,
            }
          : site.type === 'refugees'
            ? UNITS_CONFIG.worker.cost
            : { gold: 0, wood: 0 };
      claims.push({
        owner,
        unitId: event.unitId,
        turn,
        type: site.type,
        ...reward,
      });
    }
    if (event.type === 'UNIT_SPAWNED' && event.unit.type === 'scout')
      scouts.push({ owner: event.owner, unitId: event.unit.id, turn });
    if (event.type === 'BUILDING_SPAWNED' && event.building.type === 'outpost')
      outposts.push({
        owner: event.owner,
        turn,
        x: event.building.x,
        y: event.building.y,
      });
  });
  return { data: { claims, scouts, outposts }, off };
};
