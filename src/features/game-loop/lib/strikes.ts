import type { ParticipantId } from '@shared/config';
import {
  calculateDamage,
  gameEvents,
  getSightSources,
  isCellVisible,
  isFlyingType,
} from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useGameLoopStore } from '@entities/games';
import { useJournalStore } from '@entities/journals';
import { getResearchArmor } from '@entities/researches';

/**
 * Исполняет подготовленные удары осадных машин участника — шаг 8 порядка
 * хода, в начале его следующего хода. Урон получает каждый наземный
 * объект на клетке, включая свои и рабочего внутри здания; лес становится полем.
 * Удар однократный: отметка снимается сразу.
 *
 * @param owner - Участник, чей ход начался.
 */
export const executePreparedStrikes = (owner: ParticipantId) => {
  const sieges = Object.values(useUnitsStore.getState().units).filter(
    unit =>
      unit.owner === owner && unit.role === 'military' && unit.preparedStrike,
  );

  for (const { id } of sieges) {
    const siege = useUnitsStore.getState().units[id];
    if (siege?.role !== 'military' || !siege.preparedStrike) continue;
    const { x, y } = siege.preparedStrike;
    useUnitsStore.getState().setPreparedStrike(siege.id, null);
    gameEvents.emit({ type: 'SIEGE_STRIKE_EXECUTED', owner, x, y });

    // Воздух ударом не поражается.
    const units = Object.values(useUnitsStore.getState().units).filter(
      unit => unit.x === x && unit.y === y && !isFlyingType(unit.type),
    );
    const building = useBuildingsStore.getState().getBuildingAt(x, y);
    // Результат скрытого удара не раскрывает объекты под туманом.
    const visible = isCellVisible(
      getSightSources(
        owner,
        [
          ...Object.values(useUnitsStore.getState().units),
          ...Object.values(useBuildingsStore.getState().buildings),
        ],
        useMapStore.getState().grid,
      ),
      x,
      y,
    );
    const hits: string[] = [];
    for (const unit of units) {
      const damage = calculateDamage(
        siege,
        unit,
        getResearchArmor(unit, Object.values(useUnitsStore.getState().units)),
      );
      if (unit.owner === owner || !building)
        hits.push(`${unit.type}:${damage}`);
      gameEvents.emit({ type: 'ATTACK_LANDED', target: unit, damage });
      useUnitsStore.getState().damageUnit(unit.id, damage);
    }
    if (building) {
      const damage = calculateDamage(siege, building);
      hits.push(`${building.type}:${damage}`);
      gameEvents.emit({ type: 'ATTACK_LANDED', target: building, damage });
      useBuildingsStore.getState().damageBuilding(building.id, damage);
      if (!useBuildingsStore.getState().buildings[building.id]) {
        gameEvents.emit({
          type: 'SIEGE_BUILDING_DESTROYED',
          owner: building.owner,
          x,
          y,
          turn: useGameLoopStore.getState().currentTurn,
        });
      }
      // Разрушенная ратуша выводит владельца — так же, как при атаке.
      if (
        building.type === 'base' &&
        !useBuildingsStore.getState().buildings[building.id]
      ) {
        gameEvents.emit({ type: 'BASE_DESTROYED', owner: building.owner });
      }
    }
    const { getCell, setCell } = useMapStore.getState();
    if (getCell(x, y)?.type === 'forest') {
      setCell(x, y, { type: 'grass', isWalkable: true });
    }

    useJournalStore.getState().record({
      type: 'strike',
      actor: owner,
      turn: useGameLoopStore.getState().currentTurn,
      visibleTo: [owner],
      details: {
        x,
        y,
        hits: visible ? hits.join(', ') || 'пусто' : 'вне обзора',
      },
    });
    // Удар мог завершить партию: дальнейшие удары не нужны.
    if (useGameLoopStore.getState().phase !== 'inProgress') return;
  }
};
