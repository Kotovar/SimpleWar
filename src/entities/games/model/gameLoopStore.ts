import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  DEFAULT_PARTICIPANTS,
  type Participant,
  type ParticipantId,
  type Phase,
} from '@shared/config';

interface GameLoopStoreState {
  currentTurn: number;
  /** Порядок ходов; выбывшие остаются в списке и пропускаются. */
  participants: Participant[];
  eliminated: ParticipantId[];
  activePlayer: ParticipantId;
  phase: Phase;
  /** Единственный оставшийся участник; `null` — ничья или исход без победителя. */
  winner: ParticipantId | null;
  startError: string | null;

  startGame: (participants?: Participant[]) => void;
  endTurn: () => void;
  /** Выводит участников, выбывших одним действием; исход считается один раз. */
  eliminate: (...ids: ParticipantId[]) => void;
  resetGame: () => void;
}

/**
 * ID участника, которым управляет человек за этим экраном: его объекты
 * интерфейс считает «своими».
 *
 * @param participants - Участники партии.
 * @returns ID первого участника-человека или `null` в партии из одних ИИ.
 */
export const getHumanId = (participants: Participant[]) =>
  participants.find(({ controller }) => controller === 'human')?.id ?? null;

/** Невыбывшие участники в порядке ходов. */
export const getAliveParticipants = ({
  participants,
  eliminated,
}: Pick<GameLoopStoreState, 'participants' | 'eliminated'>) => {
  const out = new Set(eliminated);
  return participants.filter(({ id }) => !out.has(id));
};

export const useGameLoopStore = create<GameLoopStoreState>()(
  immer(set => {
    /** Передаёт ход следующему невыбывшему; обход начала списка завершает круг. */
    const passTurn = (state: GameLoopStoreState) => {
      const { participants } = state;
      const from = participants.findIndex(p => p.id === state.activePlayer);
      const out = new Set(state.eliminated);

      for (let step = 1; step <= participants.length; step++) {
        const index = (from + step) % participants.length;
        const next = participants[index];
        if (out.has(next.id)) continue;

        if (index <= from) state.currentTurn++;
        state.activePlayer = next.id;
        return;
      }
    };

    return {
      currentTurn: 0,
      participants: DEFAULT_PARTICIPANTS,
      eliminated: [],
      activePlayer: DEFAULT_PARTICIPANTS[0].id,
      phase: 'setup',
      winner: null,
      startError: null,

      startGame: (participants = DEFAULT_PARTICIPANTS) =>
        set(state => {
          state.phase = 'inProgress';
          state.startError = null;
          state.currentTurn = 1;
          state.participants = participants;
          state.eliminated = [];
          state.winner = null;
          state.activePlayer = participants[0].id;
        }),

      endTurn: () =>
        set(state => {
          if (state.phase !== 'inProgress') return;
          passTurn(state);
        }),

      eliminate: (...ids) =>
        set(state => {
          if (state.phase !== 'inProgress') return;

          const leavingIds = new Set(ids);
          const leaving = getAliveParticipants(state).filter(p =>
            leavingIds.has(p.id),
          );
          if (leaving.length === 0) return;

          state.eliminated.push(...leaving.map(p => p.id));
          const alive = getAliveParticipants(state);

          const isHuman = ({ controller }: Participant) =>
            controller === 'human';

          // Без живого человека партия для него окончена: оставшиеся ИИ
          // не объявляются победителями всей партии.
          if (
            alive.length <= 1 ||
            (state.participants.some(isHuman) && !alive.some(isHuman))
          ) {
            state.phase = 'gameOver';
            state.winner = alive.length === 1 ? alive[0].id : null;
            return;
          }

          if (leavingIds.has(state.activePlayer)) passTurn(state);
        }),

      resetGame: () => {
        set(state => {
          state.phase = 'setup';
          state.currentTurn = 0;
          state.participants = DEFAULT_PARTICIPANTS;
          state.eliminated = [];
          state.activePlayer = DEFAULT_PARTICIPANTS[0].id;
          state.winner = null;
          state.startError = null;
        });
      },
    };
  }),
);
