import { create } from 'zustand';
import { withDevtools } from '@shared/lib';
import {
  DEFAULT_SANDBOX,
  type ParticipantId,
  type SandboxScenario,
} from '@shared/config';

/** Счёт по типам объектов. */
export type TypeTally = Record<string, number>;

/** Итоги боя по стороне: потери и полученный урон по типам. */
export type SideStats = { losses: TypeTally; damage: TypeTally };

type SandboxState = {
  /** Партия запускается в режиме тестирования баланса. */
  enabled: boolean;
  scenario: SandboxScenario;
  /** Ходы ИИ и пассивной стороны приостановлены. */
  paused: boolean;
  /** Ускоренный ход: без паузы перед ходом ИИ. */
  fast: boolean;
  stats: Partial<Record<ParticipantId, SideStats>>;
  /** Что не поместилось при расстановке: `p1: tower`. */
  skipped: string[];
  setEnabled: (enabled: boolean) => void;
  setScenario: (scenario: SandboxScenario) => void;
  setPaused: (paused: boolean) => void;
  setFast: (fast: boolean) => void;
  setSkipped: (skipped: string[]) => void;
  /** Добавляет потерю или урон стороне. */
  tally: (
    owner: ParticipantId,
    kind: keyof SideStats,
    type: string,
    amount: number,
  ) => void;
  clearStats: () => void;
};

/** Настройки и итоги режима тестирования баланса (S15a). */
export const useSandboxStore = create<SandboxState>()(
  withDevtools('sandbox', set => ({
    enabled: false,
    scenario: DEFAULT_SANDBOX,
    paused: false,
    fast: false,
    stats: {},
    skipped: [],
    setEnabled: enabled =>
      set(state => {
        state.enabled = enabled;
      }),
    setScenario: scenario =>
      set(state => {
        state.scenario = scenario;
      }),
    setPaused: paused =>
      set(state => {
        state.paused = paused;
      }),
    setFast: fast =>
      set(state => {
        state.fast = fast;
      }),
    setSkipped: skipped =>
      set(state => {
        state.skipped = skipped;
      }),
    tally: (owner, kind, type, amount) =>
      set(state => {
        const side = (state.stats[owner] ??= { losses: {}, damage: {} });
        side[kind][type] = (side[kind][type] ?? 0) + amount;
      }),
    clearStats: () =>
      set(state => {
        state.stats = {};
        state.paused = false;
      }),
  })),
);
