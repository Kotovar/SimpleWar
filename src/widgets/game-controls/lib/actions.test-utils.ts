/** Заготовки тестов кнопок панели: свои юнит и здание, богатая сторона. */
import type { Building, Unit } from '@shared/config';
import { createBuilding } from '@entities/buildings';
import { createUnit } from '@entities/units';
import type { SelectionActionInput } from './actionButton';
import type { getSelectionActions } from './selectionActions';

export const unit = (type: Unit['type'], patch = {}) =>
  ({ ...createUnit(type, 5, 5, 'p1', false)!, ...patch }) as Unit;
export const building = (type: Building['type'], x = 6, y = 5, patch = {}) =>
  ({ ...createBuilding(type, x, y, 'p1')!, ...patch }) as Building;

const RICH = { gold: 999, wood: 999 };

export const input = (
  patch: Partial<SelectionActionInput>,
): SelectionActionInput => ({
  unit: null,
  building: null,
  isTurn: true,
  payableBuild: RICH,
  payableSpawn: RICH,
  stock: RICH,
  population: { occupied: 0, max: 10 },
  researched: [],
  researching: null,
  nearby: [],
  takenWorkplaces: new Set(),
  workerInside: null,
  mode: { building: null, unit: null, clearing: false, striking: false },
  ...patch,
});

export const byId = (buttons: ReturnType<typeof getSelectionActions>) =>
  Object.fromEntries(buttons.map(button => [button.id.split(':')[0], button]));
