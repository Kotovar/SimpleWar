import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { formatKey, isTyping } from '@shared/lib';
import { ConfirmDialog } from '@shared/ui';
import { usePreferencesStore } from '@entities/settings';
import { useGameLoopSelectors } from '@features/game-loop';
import { useSelectionActions } from '../model/useSelectionActions';
import type { ActionButton } from '../lib/selectionActions';
import { useLayoutMap } from '../model/useLayoutMap';
import { ActionCard } from './ActionCard';
import styles from './ActionBar.styles.module.css';

/** Вопрос перед необратимым действием кнопки. */
const CONFIRM: Record<string, { title: string; message: string }> = {
  demolish: {
    title: 'Снос здания',
    message: 'Снести здание? Ресурсы не вернутся.',
  },
  cancelResearch: {
    title: 'Отмена исследования',
    message: 'Отменить исследование? Цена не вернётся.',
  },
};

/**
 * Нижняя панель действий выбранного: кнопки с клавишами из справочника,
 * подменю стройки цифрами `1`…`0`. Недоступная кнопка видна сразу и
 * объясняет причину в подсказке. Панель перетаскивается за ручку,
 * положение сохраняется; двойной клик по ручке возвращает её на место.
 */
export const ActionBar = () => {
  const { humanId } = useGameLoopSelectors();
  const { buttons, run, prompt, selectionKey } = useSelectionActions();
  const layout = useLayoutMap();
  const offset = usePreferencesStore(state => state.actionBarOffset);
  const setOffset = usePreferencesStore(state => state.setActionBarOffset);
  const [submenu, setSubmenu] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ActionButton | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  // Новый выбор закрывает подменю прежнего.
  const [shownFor, setShownFor] = useState(selectionKey);
  if (shownFor !== selectionKey) {
    setShownFor(selectionKey);
    setSubmenu(null);
  }

  const parent = buttons.find(({ id }) => id === submenu);
  const shown = parent?.children ?? buttons;

  const press = (button: ActionButton) => {
    if (button.reason) return;
    if (button.children) {
      setSubmenu(open => (open === button.id ? null : button.id));
      return;
    }
    if (CONFIRM[button.id]) {
      setConfirm(button);
      return;
    }
    run(button);
    // Выбор здания сразу ведёт к выбору клетки: подменю больше не нужно.
    setSubmenu(null);
  };

  // Захват на window: срабатывает раньше клавиш карты, а отменённое
  // событие карта пропускает.
  const latest = useRef({ shown, buttons, press, submenu, selectionKey });
  latest.current = { shown, buttons, press, submenu, selectionKey };
  useEffect(() => {
    let spaceFor: string | null = null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (
        isTyping(event.target) ||
        document.querySelector('details[open], dialog[open]')
      )
        return;
      const current = latest.current;
      if (event.code === 'Escape' && current.submenu) {
        event.preventDefault();
        setSubmenu(null);
        return;
      }
      const button =
        current.shown.find(({ code }) => code === event.code) ??
        current.buttons.find(
          ({ id, code }) =>
            (id === 'skip' || id === 'sleep') && code === event.code,
        );
      if (!button) return;
      event.preventDefault();
      if (event.code === 'Space') {
        spaceFor = current.selectionKey;
        return;
      }
      current.press(button);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      const selected = spaceFor;
      spaceFor = null;
      if (!selected || selected !== latest.current.selectionKey) return;
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        isTyping(event.target) ||
        document.querySelector('details[open], dialog[open]')
      )
        return;
      const button = latest.current.buttons.find(({ id }) => id === 'skip');
      if (button) latest.current.press(button);
    };
    const onBlur = () => {
      spaceFor = null;
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  if (!humanId || !buttons.length) return null;

  const position = drag ?? offset;
  const count = shown.length + (parent ? 1 : 0);
  const rows = count > 6 ? 2 : 1;
  const onHandleDown = (event: PointerEvent<HTMLSpanElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      ox: offset.x,
      oy: offset.y,
    };
    setDrag(offset);
  };
  const onHandleMove = (event: PointerEvent<HTMLSpanElement>) => {
    if (!drag) return;
    const start = dragStart.current;
    setDrag({
      x: start.ox + event.clientX - start.x,
      y: start.oy + event.clientY - start.y,
    });
  };
  const onHandleUp = () => {
    if (drag) setOffset(drag);
    setDrag(null);
  };

  return (
    <>
      <div
        className={styles.Dock}
        style={{ translate: `${position.x}px ${position.y}px` }}
      >
        {prompt && (
          <p className={styles.Prompt} role='status'>
            {prompt} <kbd className={styles.Inline}>Esc</kbd> — отмена
          </p>
        )}
        <div
          className={styles.Bar}
          role='toolbar'
          aria-label='Действия выбранного'
          style={{
            // Больше шести кнопок — два ряда квадратов.
            ['--rows' as string]: rows,
            ['--cols' as string]: Math.ceil(count / rows),
          }}
        >
          <span
            className={styles.Handle}
            title='Перетащите панель; двойной клик — на место'
            aria-hidden
            onPointerDown={onHandleDown}
            onPointerMove={onHandleMove}
            onPointerUp={onHandleUp}
            onPointerCancel={onHandleUp}
            onDoubleClick={() => setOffset({ x: 0, y: 0 })}
          />
          {parent && (
            <button
              type='button'
              className={styles.Back}
              onClick={() => setSubmenu(null)}
            >
              ← {parent.label}
              <kbd className={styles.Key}>Esc</kbd>
            </button>
          )}
          {shown.map(button => (
            <ActionCard
              key={button.id}
              button={button}
              owner={humanId}
              keyLabel={button.code && formatKey(button.code, layout)}
              onPress={() => press(button)}
            />
          ))}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!confirm}
        title={confirm ? CONFIRM[confirm.id].title : ''}
        message={confirm ? CONFIRM[confirm.id].message : ''}
        confirmText='Да'
        cancelText='Отмена'
        onConfirm={() => {
          if (confirm) run(confirm);
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
};
