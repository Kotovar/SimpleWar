import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DEBUG_AVAILABLE,
  GUIDEBOOK_URL,
  type AiPlayback,
} from '@shared/config';
import { Checkbox, Select } from '@shared/ui';
import { useDebugStore, usePreferencesStore } from '@entities/settings';
import { useGameLoopSelectors } from '@features/game-loop';
import { useGuidanceStore } from '../../model/guidanceStore';
import { useConfirmEndTurn } from '../../model/confirmEndTurn';
import { AudioSettings } from './AudioSettings';
import styles from './GameMenu.styles.module.css';

type Props = {
  onOpenSaves?: () => void;
  onReset: () => void;
  /** Сдача; нет — участника за экраном нет, кнопка скрыта. */
  onSurrender?: () => void;
};

/**
 * Меню паузы: окно по центру. Слева действия (продолжить, сохранения,
 * гайдбук, завершение партии), справа настройки. Нативный dialog держит
 * фокус и закрывается по `Esc`; горячие клавиши карты при открытом
 * dialog молчат сами.
 */
export const GameMenu = ({ onOpenSaves, onReset, onSurrender }: Props) => {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { humanId } = useGameLoopSelectors();
  const isDebug = useDebugStore(state => state.enabled);
  const setDebug = useDebugStore(state => state.setEnabled);
  const [confirmEndTurn, setConfirmEndTurn] = useConfirmEndTurn();
  const preferences = usePreferencesStore();
  const restartTutorial = useGuidanceStore(state => state.restartTutorial);

  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const previousFocus = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [open]);

  /** Закрывает меню и выполняет пункт: следующий диалог открывается один. */
  const then = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  return (
    <>
      <button
        type='button'
        className={styles.Trigger}
        aria-haspopup='dialog'
        onClick={() => setOpen(true)}
      >
        Меню
      </button>
      {open &&
        createPortal(
          <dialog
            ref={dialog}
            className={styles.Dialog}
            aria-labelledby={titleId}
            onCancel={event => {
              event.preventDefault();
              setOpen(false);
            }}
            onClick={event => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <h2 id={titleId} className={styles.Title}>
              Меню
            </h2>
            <div className={styles.Columns}>
              <nav className={styles.Actions} aria-label='Действия'>
                <button
                  type='button'
                  className={styles.Primary}
                  autoFocus
                  onClick={() => setOpen(false)}
                >
                  Продолжить
                </button>
                {onOpenSaves && (
                  <button
                    type='button'
                    className={styles.Item}
                    onClick={then(onOpenSaves)}
                  >
                    Сохранения
                  </button>
                )}
                <a
                  className={styles.Item}
                  href={GUIDEBOOK_URL}
                  target='_blank'
                  rel='noopener'
                  aria-label='Гайдбук (откроется в новой вкладке)'
                  onClick={() => setOpen(false)}
                >
                  Гайдбук <span aria-hidden='true'>↗</span>
                </a>
                {humanId && (
                  <button
                    type='button'
                    className={styles.Item}
                    onClick={then(restartTutorial)}
                  >
                    Начать обучение заново
                  </button>
                )}
                {DEBUG_AVAILABLE && (
                  <button
                    type='button'
                    className={styles.Item}
                    aria-pressed={isDebug}
                    onClick={then(() => setDebug(!isDebug))}
                  >
                    {isDebug ? 'Выключить режим отладки' : 'Режим отладки'}
                  </button>
                )}
                <div className={styles.Danger}>
                  {onSurrender && (
                    <button
                      type='button'
                      className={styles.Item}
                      onClick={then(onSurrender)}
                    >
                      Сдаться
                    </button>
                  )}
                  <button
                    type='button'
                    className={styles.Item}
                    onClick={then(onReset)}
                  >
                    Сбросить игру
                  </button>
                </div>
              </nav>

              <div className={styles.Settings}>
                <section className={styles.Group}>
                  <h3>Партия</h3>
                  <Checkbox
                    className={styles.Row}
                    checked={confirmEndTurn}
                    onChange={setConfirmEndTurn}
                  >
                    Предупреждать о непоходивших юнитах
                  </Checkbox>
                  <label className={styles.Field}>
                    Ход ИИ
                    <Select<AiPlayback>
                      value={preferences.aiPlayback}
                      onChange={preferences.setAiPlayback}
                      options={[
                        { value: 'normal', label: 'Обычная скорость' },
                        { value: 'fast', label: 'Быстрая ×2' },
                        { value: 'instant', label: 'Без анимаций' },
                      ]}
                    />
                  </label>
                </section>
                <section className={styles.Group}>
                  <AudioSettings />
                </section>
                <section className={styles.Group}>
                  <h3>Помощь</h3>
                  <Checkbox
                    className={styles.Row}
                    checked={preferences.hintsEnabled}
                    onChange={preferences.setHintsEnabled}
                  >
                    Диалоги-подсказки
                  </Checkbox>
                  <Checkbox
                    className={styles.Row}
                    checked={preferences.tutorialEnabled}
                    onChange={preferences.setTutorialEnabled}
                  >
                    Обучение
                  </Checkbox>
                </section>
              </div>
            </div>
          </dialog>,
          document.body,
        )}
    </>
  );
};
