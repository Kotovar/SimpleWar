import type {
  Controller,
  ParticipantId,
  Resources,
  SandboxScenario,
} from '@shared/config';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useMapStore } from '@entities/maps';
import { useUnitsStore } from '@entities/units';
import { useSandboxStore, type TypeTally } from './sandboxStore';

/** Итог стороны: управление, остаток сил и запасов, потери, полученный урон. */
export type SideReport = {
  id: ParticipantId;
  controller: Controller;
  eliminated: boolean;
  stock: Resources;
  alive: TypeTally;
  losses: TypeTally;
  damage: TypeTally;
};

/** Итог боя режима тестирования: сравнимый между прогонами JSON. */
export type BattleReport = {
  seed: number | null;
  size: { cols: number; rows: number };
  scenario: SandboxScenario;
  phase: string;
  winner: ParticipantId | null;
  turns: number;
  sides: SideReport[];
};

const count = (types: string[]) =>
  types.reduce<TypeTally>((tally, type) => {
    tally[type] = (tally[type] ?? 0) + 1;
    return tally;
  }, {});

/** Собирает итог текущей партии режима тестирования из хранилищ. */
export const collectReport = (): BattleReport => {
  const loop = useGameLoopStore.getState();
  const { grid, seed } = useMapStore.getState();
  const { scenario, stats } = useSandboxStore.getState();
  const units = Object.values(useUnitsStore.getState().units);
  const buildings = Object.values(useBuildingsStore.getState().buildings);
  const resources = useEconomyStore.getState().resources;
  const eliminated = new Set(loop.eliminated);
  return {
    seed: seed ?? null,
    size: { cols: grid[0]?.length ?? 0, rows: grid.length },
    scenario,
    phase: loop.phase,
    winner: loop.winner,
    turns: loop.currentTurn,
    sides: loop.participants.map(({ id, controller }) => ({
      id,
      controller,
      eliminated: eliminated.has(id),
      stock: { ...resources[id] },
      alive: count(
        [...units, ...buildings]
          .filter(({ owner }) => owner === id)
          .map(({ type }) => type),
      ),
      losses: { ...stats[id]?.losses },
      damage: { ...stats[id]?.damage },
    })),
  };
};
