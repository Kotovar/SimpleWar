import { useEffect, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  PALETTES,
  PALETTE_IDS,
  PARTICIPANT_IDS,
  getTeamStyle,
  type PaletteId,
  type Owner,
} from '@shared/config';
import { renderHiDpiCanvas } from '@shared/lib';
import { EntityPortrait } from './EntityPortrait';
import { traceOwnerMarker } from './drawEntity';

const Marker = ({ owner, palette }: { owner: Owner; palette: PaletteId }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const team = getTeamStyle(owner, palette);
    return renderHiDpiCanvas(ref.current, 24, ctx => {
      ctx.fillStyle = team.color;
      ctx.strokeStyle = '#1c2420';
      ctx.lineWidth = 1.5;
      traceOwnerMarker(ctx, team.marker, 12, 12, 8);
      ctx.fill();
      ctx.stroke();
    });
  }, [owner, palette]);
  return (
    <canvas
      ref={ref}
      style={{ width: 24, height: 24 }}
      role='img'
      aria-label={`Маркер ${owner}`}
    />
  );
};

const PaletteGallery = ({ size }: { size: number }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: 16,
      maxWidth: 1200,
    }}
  >
    {PALETTE_IDS.map(palette => (
      <article
        key={palette}
        data-palette={palette}
        style={{
          border: `1px solid ${PALETTES[palette].color}`,
          borderRadius: 8,
          padding: 12,
        }}
      >
        <h3 style={{ color: PALETTES[palette].color, margin: '0 0 12px' }}>
          {PALETTES[palette].name}
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(['base', 'worker', 'swordsman'] as const).map(type => (
            <EntityPortrait
              key={type}
              type={type}
              owner='p1'
              palette={palette}
              size={size}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          {PARTICIPANT_IDS.map(owner => (
            <Marker key={owner} owner={owner} palette={palette} />
          ))}
        </div>
      </article>
    ))}
  </div>
);

const meta = {
  title: 'Entities/Палитры',
  component: PaletteGallery,
  args: { size: 64 },
  argTypes: { size: { control: { type: 'range', min: 24, max: 96 } } },
} satisfies Meta<typeof PaletteGallery>;
export default meta;
type Story = StoryObj<typeof meta>;
export const All: Story = { name: 'Все восемь палитр' };
