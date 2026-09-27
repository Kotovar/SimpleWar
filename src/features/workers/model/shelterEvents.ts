import { gameEvents } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { leaveBuilding } from '../lib/shelter';

// Разрушенное или снесённое здание выпускает рабочего наружу. Назначение
// к этому моменту уже снято хранилищем юнитов.
gameEvents.subscribe(event => {
  if (event.type !== 'BUILDING_DESTROYED') return;
  const { x, y } = event.building;
  for (const unit of Object.values(useUnitsStore.getState().units)) {
    if (unit.role === 'civil' && unit.x === x && unit.y === y) {
      leaveBuilding(unit.id);
    }
  }
});
