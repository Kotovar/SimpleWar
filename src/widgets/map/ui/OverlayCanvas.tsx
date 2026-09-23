import clsx from 'clsx';
import { useEffect, useRef } from 'react';
import { START_CANVAS } from '@shared/config';
import { useSettingsSelectors } from '@entities/settings';
import { setupCanvas } from './utils';
import styles from './styles.module.css';

type Props = {
  title: string;
  hint: string;
  className?: string;
};

/** Полноэкранная заставка поверх карты: заголовок и подсказка по центру. */
export const OverlayCanvas = ({ title, hint, className }: Props) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const { canvasWidth, canvasHeight } = useSettingsSelectors();

  useEffect(() => {
    const ctx = setupCanvas(ref, canvasWidth, canvasHeight);
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = START_CANVAS.backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.fillStyle = START_CANVAS.titleColor;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      title,
      canvasWidth / 2,
      canvasHeight / 2 - START_CANVAS.marginTop,
    );

    ctx.font = '24px Arial';
    ctx.fillStyle = START_CANVAS.hintColor;
    ctx.fillText(
      hint,
      canvasWidth / 2,
      canvasHeight / 2 + START_CANVAS.marginBottom,
    );
  }, [canvasHeight, canvasWidth, title, hint]);

  return <canvas ref={ref} className={clsx(styles.CanvasLayer, className)} />;
};
