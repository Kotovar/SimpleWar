import {
  MAP_PRESETS,
  PARTICIPANT_IDS,
  type Participant,
  type SandboxScenario,
} from '@shared/config';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useMapStore } from '@entities/maps';
import { useSettingsStore } from '@entities/settings';
import { useUnitsStore } from '@entities/units';
import { useGameLoopStore } from '@entities/games';
import {
  placeForces,
  useSandboxStore,
  validateScenario,
} from '@features/sandbox';
import { initializeGame } from './initializeGame';

/**
 * Старт партии режима тестирования (S15a): обычная подготовка карты и
 * стартов, затем силы сторон воспроизводимой расстановкой у их ратуш и
 * заданные запасы. Карта — из текущих настроек (размер, сид).
 *
 * @param scenario - Сценарий: стороны, их состав и управление.
 * @returns Участники для `startGame` и то, что не поместилось, либо `null`.
 */
export const initializeSandbox = (
  scenario: SandboxScenario,
): { participants: Participant[]; skipped: string[] } | null => {
  const { gridColumns: columns, gridRows: rows } = useSettingsStore.getState();
  const error =
    validateScenario(scenario) ??
    (scenario.sides.length > 2 &&
    (columns < MAP_PRESETS.large.cols || rows < MAP_PRESETS.large.rows)
      ? 'Для 3–4 участников выберите карту не меньше 30 × 30 клеток.'
      : null);
  if (error) {
    useGameLoopStore.setState({ startError: error });
    return null;
  }
  const participants = scenario.sides.map(
    (side, index): Participant => ({
      id: PARTICIPANT_IDS[index],
      controller: side.controller,
      // Запасы задаёт сценарий: сложность не нужна, только профиль.
      ...(side.controller === 'ai' && side.profile
        ? { ai: { profile: side.profile, difficulty: 'normal' } }
        : {}),
    }),
  );
  if (!initializeGame(participants, { emptyField: scenario.emptyField })) {
    return null;
  }

  // На 3–4 стороны ИИ рассаживаются по углам случайно: силы ставятся у
  // настоящей ратуши стороны, а не у угла её слота.
  const bases = Object.values(useBuildingsStore.getState().buildings).filter(
    ({ type }) => type === 'base',
  );
  const grid = useMapStore.getState().grid;
  const taken = new Set(
    [
      ...Object.values(useUnitsStore.getState().units),
      ...Object.values(useBuildingsStore.getState().buildings),
    ].map(({ x, y }) => `${x},${y}`),
  );
  const skipped: string[] = [];
  for (const [index, side] of scenario.sides.entries()) {
    const owner = participants[index].id;
    const base = bases.find(building => building.owner === owner)!;
    const placed = placeForces(grid, taken, base, side);
    for (const { type, x, y } of placed.buildings) {
      useBuildingsStore.getState().spawnBuilding(type, x, y, owner);
    }
    // Как у стартового рабочего: первый участник ходит сразу.
    for (const { type, x, y } of placed.units) {
      useUnitsStore.getState().spawnUnit(type, x, y, owner, index === 0);
    }
    skipped.push(...placed.skipped.map(type => `${owner}: ${type}`));
    useEconomyStore.setState({
      resources: {
        ...useEconomyStore.getState().resources,
        [owner]: { ...side.stock },
      },
    });
  }
  // Первая сторона ходит сразу: восстановить ей все очки, включая атаку,
  // как второй стороне перед её первым ходом.
  useUnitsStore.getState().resetUnitsForNewTurn(participants[0].id);
  useBuildingsStore.getState().resetBuildingsForNewTurn(participants[0].id);
  useSandboxStore.getState().clearStats();
  useSandboxStore.getState().setSkipped(skipped);
  return { participants, skipped };
};
