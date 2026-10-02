type Props = {
  /** Размер квадрата иконки в пикселях. */
  size?: number;
};

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 16 16',
  'aria-hidden': true,
  focusable: false,
  style: { flexShrink: 0, verticalAlign: '-0.15em' },
});

/** Монета: золото. */
export const GoldIcon = ({ size = 14 }: Props) => (
  <svg {...base(size)}>
    <circle cx='8' cy='8' r='6.4' fill='var(--gold)' />
    <circle
      cx='8'
      cy='8'
      r='6.4'
      fill='none'
      stroke='rgb(0 0 0 / 0.35)'
      strokeWidth='1.2'
    />
    <path
      d='M8 4.2v7.6M6 6h4M6 10h4'
      stroke='rgb(0 0 0 / 0.45)'
      strokeWidth='1.3'
      strokeLinecap='round'
      fill='none'
    />
  </svg>
);

/** Брёвна: древесина. */
export const WoodIcon = ({ size = 14 }: Props) => (
  <svg {...base(size)}>
    <rect x='1.2' y='3' width='13.6' height='4.4' rx='2.2' fill='var(--wood)' />
    <rect
      x='1.2'
      y='8.6'
      width='13.6'
      height='4.4'
      rx='2.2'
      fill='var(--wood)'
    />
    <ellipse cx='3.6' cy='5.2' rx='1.5' ry='1.9' fill='rgb(0 0 0 / 0.3)' />
    <ellipse cx='3.6' cy='10.8' rx='1.5' ry='1.9' fill='rgb(0 0 0 / 0.3)' />
  </svg>
);

/** Силуэты: занятые слоты населения. */
export const PopulationIcon = ({ size = 14 }: Props) => (
  <svg {...base(size)}>
    <circle cx='8' cy='4.6' r='2.8' fill='var(--population)' />
    <path
      d='M2.4 14c0-3.1 2.5-5.2 5.6-5.2s5.6 2.1 5.6 5.2z'
      fill='var(--population)'
    />
  </svg>
);

/** Наковальня: исследования кузницы. */
export const ResearchIcon = ({ size = 14 }: Props) => (
  <svg {...base(size)}>
    <path
      d='M1.5 4.5h10.5c0 2-1.6 3.2-3.5 3.4v1.6h2.2v2H5.3v-2h2.2V7.9C4 7.7 1.5 6.3 1.5 4.5z'
      fill='var(--research)'
    />
    <path d='M4 13.5h8' stroke='var(--research)' strokeWidth='1.6' />
  </svg>
);

/** Холм: выбрана клетка. */
export const TerrainIcon = ({ size = 16 }: Props) => (
  <svg {...base(size)}>
    <path d='M0.8 13.5 5.5 6l3.3 4.6L10.8 8l4.4 5.5z' fill='#6ea760' />
    <circle cx='12.4' cy='3.6' r='2.2' fill='var(--gold)' />
  </svg>
);

/** Динамик: звук; `muted` — перечёркнут. */
export const SoundIcon = ({
  size = 16,
  muted = false,
}: Props & { muted?: boolean }) => (
  <svg {...base(size)}>
    <path d='M2 6h2.6L8 3v10L4.6 10H2z' fill='currentColor' />
    {muted ? (
      <path
        d='M10.5 5.5l4 5m0-5-4 5'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
    ) : (
      <path
        d='M10.4 5.6a3.4 3.4 0 0 1 0 4.8M12.2 3.8a6 6 0 0 1 0 8.4'
        stroke='currentColor'
        strokeWidth='1.4'
        strokeLinecap='round'
        fill='none'
      />
    )}
  </svg>
);
