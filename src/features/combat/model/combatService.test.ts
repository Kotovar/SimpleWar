import {
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
} from 'vite-plus/test';
import type { BuildingType, Owner, UnitType } from '@shared/config';
import { gameEvents } from '@shared/lib';
import { useBuildingsStore } from '@entities/buildings';
import { useGameLoopStore } from '@entities/games';
import { useUnitsStore } from '@entities/units';
import { attack } from './combatService';

const addUnit = (type: UnitType, x: number, y: number, owner: Owner) => {
  const id = useUnitsStore.getState().spawnUnit(type, x, y, owner, true);
  if (!id) throw new Error(`Не удалось создать юнита ${type}`);
  return id;
};

const addBuilding = (
  type: BuildingType,
  x: number,
  y: number,
  owner: Owner,
) => {
  const id = useBuildingsStore.getState().spawnBuilding(type, x, y, owner);
  if (!id) throw new Error(`Не удалось создать здание ${type}`);
  return id;
};

const getUnit = (id: string) => {
  const unit = useUnitsStore.getState().units[id];
  if (!unit) throw new Error(`Юнит ${id} отсутствует`);
  return unit;
};

const getMilitaryUnit = (id: string) => {
  const unit = getUnit(id);
  if (unit.role !== 'military') throw new Error(`Юнит ${id} не военный`);
  return unit;
};

const getBuilding = (id: string) => {
  const building = useBuildingsStore.getState().buildings[id];
  if (!building) throw new Error(`Здание ${id} отсутствует`);
  return building;
};

const getCombatBuilding = (id: string) => {
  const building = getBuilding(id);
  if (building.role !== 'combat') throw new Error(`Здание ${id} не боевое`);
  return building;
};

beforeEach(() => {
  useUnitsStore.setState({ units: {}, selectedUnitForSpawn: null });
  useBuildingsStore.setState({
    buildings: {},
    selectedBuildingForSpawn: null,
  });
  useGameLoopStore.setState({ phase: 'inProgress', activePlayer: 'player' });
});

describe('attack', () => {
  it('damages an in-range enemy unit and spends one attack point', () => {
    const attackerId = addUnit('swordsman', 1, 1, 'player');
    const targetId = addUnit('worker', 2, 1, 'ai');
    useUnitsStore.getState().resetUnitsForNewTurn();
    const attacker = getMilitaryUnit(attackerId);
    const target = getUnit(targetId);

    attack(attackerId, targetId);

    expect(getUnit(targetId).hp).toBe(target.hp - attacker.attack);
    expect(getMilitaryUnit(attackerId).attackPoints).toBe(
      attacker.attackPoints - 1,
    );
  });

  it('does nothing during the setup phase', () => {
    const attackerId = addUnit('swordsman', 1, 1, 'player');
    const targetId = addUnit('worker', 2, 1, 'ai');
    useUnitsStore.getState().resetUnitsForNewTurn();
    const attacker = getMilitaryUnit(attackerId);
    const target = getUnit(targetId);
    useGameLoopStore.setState({ phase: 'setup' });

    attack(attackerId, targetId);

    expect(getUnit(targetId).hp).toBe(target.hp);
    expect(getMilitaryUnit(attackerId).attackPoints).toBe(
      attacker.attackPoints,
    );
  });

  it('does nothing when the attacker is out of range', () => {
    const attackerId = addUnit('swordsman', 1, 1, 'player');
    const attacker = getMilitaryUnit(attackerId);
    const targetId = addUnit(
      'worker',
      attacker.x + attacker.attackRange + 1,
      attacker.y,
      'ai',
    );
    useUnitsStore.getState().resetUnitsForNewTurn();
    const readyAttacker = getMilitaryUnit(attackerId);
    const target = getUnit(targetId);

    attack(attackerId, targetId);

    expect(getUnit(targetId).hp).toBe(target.hp);
    expect(getMilitaryUnit(attackerId).attackPoints).toBe(
      readyAttacker.attackPoints,
    );
  });

  it('does nothing when the attacker does not own the active turn', () => {
    const attackerId = addUnit('swordsman', 1, 1, 'ai');
    const targetId = addUnit('worker', 2, 1, 'player');
    useUnitsStore.getState().resetUnitsForNewTurn();
    const attacker = getMilitaryUnit(attackerId);
    const target = getUnit(targetId);

    attack(attackerId, targetId);

    expect(getUnit(targetId).hp).toBe(target.hp);
    expect(getMilitaryUnit(attackerId).attackPoints).toBe(
      attacker.attackPoints,
    );
  });

  it('emits base destruction when a combat building destroys an enemy base', () => {
    const attackerId = addBuilding('tower', 1, 1, 'player');
    const targetId = addBuilding('base', 2, 1, 'ai');
    useBuildingsStore.getState().resetBuildingsForNewTurn();
    const attacker = getCombatBuilding(attackerId);
    const target = getBuilding(targetId);
    useBuildingsStore.getState().damageBuilding(targetId, target.hp - 1);

    let destroyedBaseOwner: Owner | undefined;
    const unsubscribe = gameEvents.subscribe(event => {
      if (event.type === 'BASE_DESTROYED') destroyedBaseOwner = event.owner;
    });
    onTestFinished(unsubscribe);

    attack(attackerId, targetId);

    expect(useBuildingsStore.getState().buildings[targetId]).toBeUndefined();
    expect(destroyedBaseOwner).toBe('ai');
    expect(getCombatBuilding(attackerId).attackPoints).toBe(
      attacker.attackPoints - 1,
    );
  });
});
