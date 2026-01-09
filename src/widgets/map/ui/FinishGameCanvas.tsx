import clsx from 'clsx';
import { useEffect, useRef } from 'react';
import { START_CANVAS } from '@shared/config';
import { useSettingsSelectors } from '@entities/settings';
import { useGameLoopSelectors } from '@features/game-loop';
import { getCtx } from './utils';
import styles from './styles.module.css';

export const FinishGameCanvas = () => {
  const uiOverlayRef = useRef<HTMLCanvasElement>(null);
  const { phase, activePlayer } = useGameLoopSelectors();
  const { canvasWidth, canvasHeight } = useSettingsSelectors();

  useEffect(() => {
    const ctx = getCtx(uiOverlayRef);
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (phase === 'gameOver') {
      ctx.fillStyle = START_CANVAS.backgroundColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      ctx.fillStyle = START_CANVAS.titleColor;
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        activePlayer === 'player' ? 'Победа!' : 'Поражение...',
        canvasWidth / 2,
        canvasHeight / 2 - START_CANVAS.marginTop,
      );

      ctx.font = '24px Arial';
      ctx.fillStyle = START_CANVAS.hintColor;
      ctx.fillText(
        'Нажмите "Начать новую игру" для старта новой игры',
        canvasWidth / 2,
        canvasHeight / 2 + START_CANVAS.marginBottom,
      );
    }
  }, [activePlayer, canvasHeight, canvasWidth, phase]);

  return (
    <>
      {phase === 'gameOver' ? (
        <canvas
          ref={uiOverlayRef}
          width={canvasWidth}
          height={canvasHeight}
          className={clsx(styles.CanvasLayer, styles.FinishCanvas)}
        />
      ) : null}
    </>
  );
};
