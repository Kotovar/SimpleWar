import { useState } from 'react';
import { RESEARCH_CONFIG, type ParticipantId } from '@shared/config';
import { ConfirmDialog } from '@shared/ui';
import { useGameLoopStore } from '@entities/games';
import { useResearchStore } from '@entities/researches';
import { cancelResearch } from '@features/research';
import styles from './OptionCards.styles.module.css';

/**
 * Отмена текущего исследования с подтверждением, без возврата цены.
 * Кузница не нужна: работу на паузе тоже можно отменить.
 *
 * @param owner - Сторона, чья работа отменяется.
 */
export const CancelResearch = ({ owner }: { owner: ParticipantId }) => {
  const [confirm, setConfirm] = useState(false);
  const current = useResearchStore(state => state.current[owner]);
  const isTurn = useGameLoopStore(state => state.activePlayer === owner);
  if (!current) return null;

  return (
    <div className={styles.List}>
      <button
        type='button'
        className={styles.Card}
        disabled={!isTurn}
        onClick={() => setConfirm(true)}
      >
        <span className={styles.Content}>
          <span className={styles.Name}>Отменить исследование</span>
          <span className={styles.Info}>Ресурсы не возвращаются.</span>
        </span>
      </button>
      <ConfirmDialog
        isOpen={confirm}
        title='Отмена исследования'
        message={`Отменить «${RESEARCH_CONFIG[current.type].name}»? Ресурсы не вернутся.`}
        confirmText='Отменить'
        cancelText='Продолжить'
        onConfirm={() => {
          setConfirm(false);
          cancelResearch(owner);
        }}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
};
