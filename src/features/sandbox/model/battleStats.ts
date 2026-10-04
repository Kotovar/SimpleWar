import type { ParticipantId } from '@shared/config';
import { gameEvents, isRestoringGame } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useGameLoopStore } from '@entities/games';
import { useSandboxStore } from './sandboxStore';

let unsubscribe: (() => void) | null = null;

/** Учёт идёт только в партии режима тестирования. */
const counting = () =>
  !isRestoringGame() &&
  useSandboxStore.getState().enabled &&
  useGameLoopStore.getState().phase === 'inProgress';

/** HP, потерянное объектами между состояниями хранилища. */
const lostHp = <T extends { hp: number; owner: ParticipantId; type: string }>(
  next: Record<string, T>,
  prev: Record<string, T>,
) => {
  const { tally } = useSandboxStore.getState();
  for (const [id, before] of Object.entries(prev)) {
    const after = next[id];
    if (after && after.hp < before.hp) {
      tally(before.owner, 'damage', before.type, before.hp - after.hp);
    }
  }
};

/**
 * Итоги боя S15a: потери по событиям гибели и разрушения, полученный урон —
 * по уменьшению HP (гибель добавляет остаток HP). Выбывание стороны удаляет
 * её объекты без событий и в потери не входит, как и снос своего здания. Повторный вызов безопасен.
 */
export const initBattleStats = () => {
  if (unsubscribe) return;
  const offEvents = gameEvents.subscribe(event => {
    if (event.type === 'GAME_RESET') {
      useSandboxStore.getState().clearStats();
      return;
    }
    if (!counting()) return;
    const { tally } = useSandboxStore.getState();
    // Добровольный снос — не потеря в бою и не полученный урон.
    if (
      event.type === 'UNIT_DESTROYED' ||
      (event.type === 'BUILDING_DESTROYED' && !event.demolished)
    ) {
      const entity =
        event.type === 'UNIT_DESTROYED' ? event.unit : event.building;
      tally(event.owner, 'losses', entity.type, 1);
      tally(event.owner, 'damage', entity.type, Math.max(0, entity.hp));
    }
  });
  const offUnits = useUnitsStore.subscribe((state, prev) => {
    if (counting()) lostHp(state.units, prev.units);
  });
  const offBuildings = useBuildingsStore.subscribe((state, prev) => {
    if (counting()) lostHp(state.buildings, prev.buildings);
  });
  unsubscribe = () => {
    offEvents();
    offUnits();
    offBuildings();
    unsubscribe = null;
  };
};

/** Отключает учёт: для тестов. */
export const stopBattleStats = () => unsubscribe?.();
