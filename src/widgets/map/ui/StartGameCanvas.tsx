import { useEffect, useRef } from 'react';
import { GAME_TITLE, START_CANVAS } from '@shared/config';
import { useSettingsSelectors } from '@entities/settings';
import { useGameLoopSelectors } from '@features/game-loop';
import { getCtx } from './utils';
import styles from './styles.module.css';

export const StartGameCanvas = () => {
  const uiOverlayRef = useRef<HTMLCanvasElement>(null);
  const { phase } = useGameLoopSelectors();
  const { canvasWidth, canvasHeight } = useSettingsSelectors();

  useEffect(() => {
    const ctx = getCtx(uiOverlayRef);
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (phase === 'setup') {
      ctx.fillStyle = START_CANVAS.backgroundColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      ctx.fillStyle = START_CANVAS.titleColor;
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        GAME_TITLE,
        canvasWidth / 2,
        canvasHeight / 2 - START_CANVAS.marginTop,
      );

      ctx.font = '24px Arial';
      ctx.fillStyle = START_CANVAS.hintColor;
      ctx.fillText(
        'Нажмите "Начать игру" для старта',
        canvasWidth / 2,
        canvasHeight / 2 + START_CANVAS.marginBottom,
      );
    }
  }, [canvasHeight, canvasWidth, phase]);

  return (
    <canvas
      ref={uiOverlayRef}
      width={canvasWidth}
      height={canvasHeight}
      className={styles.CanvasLayer}
    />
  );
};
