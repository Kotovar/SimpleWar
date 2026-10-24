import { useEffect, useRef } from 'react';
import type { SiteType } from '@shared/config';
import { renderHiDpiCanvas } from '@shared/lib';
import { drawSite } from './drawSite';

export const SitePortrait = ({
  type,
  size = 48,
}: {
  type: SiteType;
  size?: number;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current)
      return renderHiDpiCanvas(ref.current, size, ctx =>
        drawSite(ctx, type, 0, 0, size),
      );
  }, [type, size]);
  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size, flexShrink: 0 }}
      aria-hidden='true'
    />
  );
};
