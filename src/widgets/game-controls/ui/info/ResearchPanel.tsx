import { useState } from 'react';
import {
  RESEARCH_CONFIG,
  RESEARCH_TYPES,
  REJECTION_MESSAGE,
  type ParticipantId,
  type ResearchType,
} from '@shared/config';
import { ConfirmDialog, GoldIcon, WoodIcon } from '@shared/ui';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useResearchStore } from '@entities/researches';
import { cancelResearch, startResearch } from '@features/research';
import styles from './OptionCards.styles.module.css';

const turnsText = (turns: number) =>
  `${turns} ${turns === 1 ? 'ход' : turns < 5 ? 'хода' : 'ходов'}`;

/**
 * Исследования стороны: цена, срок, эффект, прогресс текущей работы и
 * отмена с подтверждением. Не зависит от правой панели: сторону передаёт
 * контейнер, данные и действия берутся из хранилищ.
 *
 * @param owner - Сторона, чьи исследования показываются и запускаются.
 */
export const ResearchPanel = ({ owner }: { owner: ParticipantId }) => {
  const completed = useResearchStore(state => state.completed[owner]);
  const current = useResearchStore(state => state.current[owner]);
  const stock = useEconomyStore(state => state.resources[owner]);
  const isTurn = useGameLoopStore(state => state.activePlayer === owner);

  const reasonFor = (type: ResearchType) => {
    const { cost } = RESEARCH_CONFIG[type];
    if (completed?.includes(type)) return null;
    if (current) return REJECTION_MESSAGE.researching;
    if (stock.gold < cost.gold || stock.wood < cost.wood) {
      return REJECTION_MESSAGE.resources;
    }
    if (!isTurn) return REJECTION_MESSAGE.turn;
    return null;
  };

  return (
    <section className={styles.Section}>
      <header className={styles.Header}>
        <h4 className={styles.Title}>Исследования</h4>
        <span className={styles.Points} data-empty={!!current}>
          {current
            ? `Идёт: ${RESEARCH_CONFIG[current.type].name}`
            : 'Кузница свободна'}
        </span>
      </header>

      <div className={styles.List}>
        {RESEARCH_TYPES.map(type => {
          const { name, effect, cost, turns } = RESEARCH_CONFIG[type];
          const isDone = completed?.includes(type) ?? false;
          const isCurrent = current?.type === type;
          const reason = isCurrent ? null : reasonFor(type);

          return (
            <button
              key={type}
              type='button'
              className={styles.Card}
              disabled={isDone || isCurrent || !!reason}
              aria-pressed={isCurrent}
              title={reason ?? effect}
              onClick={() => startResearch({ actor: owner, research: type })}
            >
              <span className={styles.Content}>
                <span className={styles.Name}>
                  {name}
                  {isDone && ' · изучено'}
                </span>
                {!isDone && (
                  <span className={styles.Costs}>
                    <span
                      className={styles.Cost}
                      aria-label={`${cost.gold} золота`}
                      data-lacking={!isCurrent && stock.gold < cost.gold}
                    >
                      <GoldIcon /> {cost.gold}
                    </span>
                    <span
                      className={styles.Cost}
                      aria-label={`${cost.wood} дерева`}
                      data-lacking={!isCurrent && stock.wood < cost.wood}
                    >
                      <WoodIcon /> {cost.wood}
                    </span>
                    <span className={styles.Cost} data-kind='population'>
                      {turnsText(turns)}
                    </span>
                  </span>
                )}
                <span className={styles.Info}>{effect}</span>
                {isCurrent && current && (
                  <>
                    <meter
                      min={0}
                      max={turns}
                      value={turns - current.turnsLeft}
                      aria-label='Прогресс исследования'
                    />
                    <span className={styles.Info}>
                      Осталось {turnsText(current.turnsLeft)}: прогресс в конце
                      вашего хода, без кузницы — пауза.
                    </span>
                  </>
                )}
                {!isDone && reason && (
                  <span className={styles.Reason}>{reason}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {current && <CancelResearch owner={owner} />}
    </section>
  );
};

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
