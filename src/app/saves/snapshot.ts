import { version as GAME_VERSION } from '../../../package.json';
import {
  DEBUG_AVAILABLE,
  DEFAULT_AI_SETUP,
  MAP_GENERATOR_VERSION,
  type ParticipantId,
} from '@shared/config';
import { restoreGameState } from '@shared/lib';
import { useSettingsStore, useDebugStore } from '@entities/settings';
import { useGameLoopStore } from '@entities/games';
import { useMapStore } from '@entities/maps';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useResearchStore } from '@entities/researches';
import {
  useKnowledgeStore,
  type ParticipantKnowledge,
} from '@entities/perceptions';
import { useAiMemoryStore } from '@entities/ai-memories';
import { useJournalStore } from '@entities/journals';
import { useSandboxStore } from '@features/sandbox';
import { useSelectionStore } from '@features/selection';
import { useMovementStore, useHighlightStore } from '@features/pathfinding';
import { useGuidanceStore } from '@widgets/game-controls';
import type { GameSnapshot } from './types';
import { parseSnapshot } from './validation';

const data = <T extends object>(state: T) =>
  Object.fromEntries(
    Object.entries(state).filter(([, value]) => typeof value !== 'function'),
  );

export const strikeDueTurn = (
  snapshot: Pick<GameSnapshot, 'loop'>,
  owner: ParticipantId,
) => {
  const { participants, activePlayer, currentTurn } = snapshot.loop;
  return (
    currentTurn +
    (participants.findIndex(p => p.id === owner) <=
    participants.findIndex(p => p.id === activePlayer)
      ? 1
      : 0)
  );
};

/** Снимок только данных; копирование также разрывает ссылки на живые хранилища. */
export const captureSnapshot = (): GameSnapshot => {
  const loop = useGameLoopStore.getState();
  const settings = useSettingsStore.getState();
  const map = useMapStore.getState();
  const units = useUnitsStore.getState().units;
  const knowledge = Object.fromEntries(
    Object.entries(useKnowledgeStore.getState().byParticipant).map(
      ([id, value]) => [
        id,
        {
          ...value,
          visible: Array.from(value.visible),
          terrain: Array.from(value.terrain),
        },
      ],
    ),
  );
  const snapshot = {
    version: 1,
    gameVersion: GAME_VERSION,
    generatorVersion: MAP_GENERATOR_VERSION,
    race: 'basic',
    loop: {
      currentTurn: loop.currentTurn,
      participants: loop.participants.map(p =>
        p.controller === 'ai' ? { ...p, ai: p.ai ?? DEFAULT_AI_SETUP } : p,
      ),
      eliminated: loop.eliminated,
      activePlayer: loop.activePlayer,
      phase: loop.phase,
      winner: loop.winner,
    },
    map: { grid: map.grid, seed: map.seed, usedFallback: map.usedFallback },
    rules: {
      gridColumns: settings.gridColumns,
      gridRows: settings.gridRows,
      mapGenerationMode: settings.mapGenerationMode,
      customSeed: Number.isFinite(settings.customSeed)
        ? settings.customSeed
        : 0,
      aiSetup: settings.aiSetup,
    },
    view: { camera: settings.camera, cellSize: settings.cellSize },
    debug: data(useDebugStore.getState()),
    units,
    buildings: useBuildingsStore.getState().buildings,
    economy: {
      resources: useEconomyStore.getState().resources,
      populationCap: useEconomyStore.getState().populationCap,
    },
    research: {
      completed: useResearchStore.getState().completed,
      current: useResearchStore.getState().current,
    },
    knowledge,
    ai: useAiMemoryStore.getState().byParticipant,
    strikes: Object.fromEntries(
      Object.values(units)
        .filter(u => u.role === 'military' && u.preparedStrike)
        .map(u => [
          u.id,
          {
            owner: u.owner,
            target: u.role === 'military' ? u.preparedStrike : null,
            dueTurn: strikeDueTurn({ loop }, u.owner),
          },
        ]),
    ),
    journal: useJournalStore.getState().entries,
    guidance: data(useGuidanceStore.getState()),
    sandbox: data(useSandboxStore.getState()),
  };
  return parseSnapshot(JSON.stringify(snapshot));
};

/** Проверка завершается до первой мутации; никаких событий начала хода или спавна. */
export const applySnapshot = (input: GameSnapshot) => {
  const snapshot = parseSnapshot(JSON.stringify(input));
  const knowledge: Partial<Record<ParticipantId, ParticipantKnowledge>> = {};
  for (const id of snapshot.loop.participants.map(p => p.id)) {
    const saved = snapshot.knowledge[id];
    if (saved)
      knowledge[id] = {
        ...saved,
        visible: Uint8Array.from(saved.visible),
        terrain: Uint8Array.from(saved.terrain),
      };
  }
  restoreGameState(() => {
    const journal = useJournalStore.getState();
    const gameId = journal.gameId + 1;
    useJournalStore.setState({
      gameId,
      entries: snapshot.journal.map(entry => ({ ...entry, gameId })),
      nextId: Math.max(
        journal.nextId,
        ...snapshot.journal.map(entry => entry.id + 1),
      ),
      errors: [],
      decisions: [],
    });
    useMapStore.setState(snapshot.map);
    useSettingsStore.setState({ ...snapshot.rules, ...snapshot.view });
    useDebugStore.setState({
      ...snapshot.debug,
      enabled: snapshot.debug.enabled && DEBUG_AVAILABLE,
    });
    useUnitsStore.setState({
      units: snapshot.units,
      selectedUnitForSpawn: null,
    });
    useBuildingsStore.setState({
      buildings: snapshot.buildings,
      selectedBuildingForSpawn: null,
      selectedRallyBuildingId: null,
    });
    useEconomyStore.setState(snapshot.economy);
    useResearchStore.setState(snapshot.research);
    useAiMemoryStore.setState({ byParticipant: snapshot.ai });
    useSandboxStore.setState(snapshot.sandbox);
    useGameLoopStore.setState({
      ...snapshot.loop,
      reviewWorld: false,
      startError: null,
    });
    useKnowledgeStore.setState({ byParticipant: knowledge });
    useGuidanceStore.setState(snapshot.guidance);
    useSelectionStore.getState().clearSelection();
    useMovementStore.getState().resetStore();
    useHighlightStore.getState().resetStore();
  });
  // Новое окно может отличаться по размеру; камера ограничивается обычным способом.
  const settings = useSettingsStore.getState();
  settings.setViewport(settings.viewport.width, settings.viewport.height);
};
