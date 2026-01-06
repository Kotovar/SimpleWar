import type { RefObject } from 'react';

export const getCtx = (ref: RefObject<HTMLCanvasElement | null>) => {
  const canvas = ref.current;
  if (!canvas) return;

  return canvas.getContext('2d');
};
