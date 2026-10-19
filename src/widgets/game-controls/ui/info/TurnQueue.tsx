import {
  getParticipantName,
  type Participant,
  type ParticipantId,
} from '@shared/config';
import { useGameLoopSelectors } from '@features/game-loop';
import { SideMark } from './SideMark';
import styles from './TurnInfo.styles.module.css';

type Props = {
  participants: readonly Participant[];
  eliminated: readonly ParticipantId[];
  activePlayer: ParticipantId;
  humanId: ParticipantId | null;
};

/** Очередь по данным партии: стороны по порядку хода. */
export const TurnQueueList = ({
  participants,
  eliminated,
  activePlayer,
  humanId,
}: Props) => {
  if (participants.length < 3) return null;
  return (
    <ol className={styles.Queue} aria-label='Очередь ходов'>
      {participants.map(({ id }) => {
        const out = eliminated.includes(id);
        const name = getParticipantName(id, participants);
        const label = `${name}${id === humanId ? ' (вы)' : ''}${out ? ' — выбыли' : ''}`;
        return (
          <li
            key={id}
            className={styles.QueueItem}
            data-active={id === activePlayer || undefined}
            data-out={out || undefined}
            title={label}
            aria-label={label}
            aria-current={id === activePlayer ? 'step' : undefined}
          >
            <SideMark owner={id} participants={participants} />
          </li>
        );
      })}
    </ol>
  );
};

/**
 * Очередь ходов: стороны в порядке хода, текущая выделена, выбывшие
 * зачёркнуты. Служит и легендой цветов. На двоих не нужна — хватает бейджа.
 */
export const TurnQueue = () => <TurnQueueList {...useGameLoopSelectors()} />;
