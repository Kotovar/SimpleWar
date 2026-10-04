import type { ParticipantId, Position } from '@shared/config';
import type { useSettingsStore, useDebugStore } from '@entities/settings';
import type { useGameLoopStore } from '@entities/games';
import type { useMapStore } from '@entities/maps';
import type { useUnitsStore } from '@entities/units';
import type { useBuildingsStore } from '@entities/buildings';
import type { useEconomyStore } from '@entities/economies';
import type { useResearchStore } from '@entities/researches';
import type { ParticipantKnowledge } from '@entities/perceptions';
import type { useAiMemoryStore } from '@entities/ai-memories';
import type { JournalEntry } from '@entities/journals';
import type { useSandboxStore } from '@features/sandbox';
import type { useGuidanceStore } from '@widgets/game-controls';

type Data<T> = {
  [K in keyof T as T[K] extends (...args: never[]) => unknown
    ? never
    : K]: T[K];
};
export type GameSnapshot = {
  version: 1;
  gameVersion: string;
  generatorVersion: number;
  race: 'basic';
  loop: Pick<
    ReturnType<typeof useGameLoopStore.getState>,
    | 'currentTurn'
    | 'participants'
    | 'eliminated'
    | 'activePlayer'
    | 'phase'
    | 'winner'
  >;
  map: Pick<
    ReturnType<typeof useMapStore.getState>,
    'grid' | 'seed' | 'usedFallback'
  >;
  rules: Pick<
    ReturnType<typeof useSettingsStore.getState>,
    'gridColumns' | 'gridRows' | 'mapGenerationMode' | 'customSeed' | 'aiSetup'
  >;
  view: Pick<
    ReturnType<typeof useSettingsStore.getState>,
    'camera' | 'cellSize'
  >;
  debug: Data<ReturnType<typeof useDebugStore.getState>>;
  units: ReturnType<typeof useUnitsStore.getState>['units'];
  buildings: ReturnType<typeof useBuildingsStore.getState>['buildings'];
  economy: Pick<
    ReturnType<typeof useEconomyStore.getState>,
    'resources' | 'populationCap'
  >;
  research: Pick<
    ReturnType<typeof useResearchStore.getState>,
    'completed' | 'current'
  >;
  knowledge: Partial<
    Record<
      ParticipantId,
      Omit<ParticipantKnowledge, 'visible' | 'terrain'> & {
        visible: number[];
        terrain: number[];
      }
    >
  >;
  ai: ReturnType<typeof useAiMemoryStore.getState>['byParticipant'];
  strikes: Record<
    string,
    { owner: ParticipantId; target: Position; dueTurn: number }
  >;
  journal: JournalEntry[];
  guidance: Data<ReturnType<typeof useGuidanceStore.getState>>;
  sandbox: Data<ReturnType<typeof useSandboxStore.getState>>;
};

export {
  SAVE_VERSION,
  MANUAL_SLOTS,
  MAX_SAVE_BYTES,
  DEFAULT_AUTO,
  type AutoSettings,
} from '@shared/config';
export type SaveRecord = {
  id: string;
  name: string;
  savedAt: string;
  snapshot: GameSnapshot;
};
export type Slot = {
  key: string;
  auto: boolean;
  record?: SaveRecord;
  error?: string;
  damagedRaw?: string;
};
