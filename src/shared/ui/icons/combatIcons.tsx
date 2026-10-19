import type { ReactNode } from 'react';
import { CATEGORY_AGAINST, type TargetCategory } from '@shared/config';

type Props = {
  /** Размер квадрата иконки в пикселях. */
  size?: number;
};

const svg = (size: number, children: ReactNode) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 16 16'
    aria-hidden
    focusable={false}
    style={{ flexShrink: 0, verticalAlign: '-0.2em' }}
  >
    {children}
  </svg>
);

const INK = '#1c221e';

/** Меч: пехота. */
export const InfantryIcon = ({ size = 14 }: Props) =>
  svg(
    size,
    <>
      <path
        d='M12.8 1.6 14.4 3.2 6.4 11.2 4.8 9.6z'
        fill='#dfe6e8'
        stroke={INK}
        strokeWidth='0.8'
      />
      <path
        d='M3.2 9.6 6.4 12.8M4.4 11.6 2 14'
        stroke='#c9a36a'
        strokeWidth='1.6'
        strokeLinecap='round'
      />
    </>,
  );

/** Лук со стрелой: стрелки. */
export const RangedIcon = ({ size = 14 }: Props) =>
  svg(
    size,
    <>
      <path
        d='M4 1.8Q14 8 4 14.2'
        fill='none'
        stroke='#d19a55'
        strokeWidth='1.8'
      />
      <path d='M4 1.8V14.2' stroke='#f6e9c7' strokeWidth='0.8' />
      <path
        d='M2.5 8H14M11.5 6 14 8 11.5 10'
        fill='none'
        stroke='#e8dcc0'
        strokeWidth='1.2'
        strokeLinecap='round'
      />
    </>,
  );

/** Подкова: конница. */
export const CavalryIcon = ({ size = 14 }: Props) =>
  svg(
    size,
    <path
      d='M3.5 13.5V7a4.5 4.5 0 0 1 9 0v6.5'
      fill='none'
      stroke='#c6d1d5'
      strokeWidth='2.6'
      strokeLinecap='round'
    />,
  );

/** Камень катапульты: осада. */
export const SiegeIcon = ({ size = 14 }: Props) =>
  svg(
    size,
    <>
      <path
        d='M2 13.5h12'
        stroke='#8a6238'
        strokeWidth='2'
        strokeLinecap='round'
      />
      <path
        d='M5 12.5 11.5 4'
        stroke='#a07a48'
        strokeWidth='1.6'
        strokeLinecap='round'
      />
      <circle
        cx='12'
        cy='3.6'
        r='2.2'
        fill='#9aa5a3'
        stroke={INK}
        strokeWidth='0.6'
      />
    </>,
  );

/** Кирка: рабочие. */
export const CivilIcon = ({ size = 14 }: Props) =>
  svg(
    size,
    <>
      <path
        d='M4 13.5 11 4.5'
        stroke='#a0703f'
        strokeWidth='1.8'
        strokeLinecap='round'
      />
      <path
        d='M5.5 3.5Q10.5 1 14 5.5'
        fill='none'
        stroke='#c6d1d5'
        strokeWidth='2'
        strokeLinecap='round'
      />
    </>,
  );

/** Крыло: летающие. */
export const FlyingIcon = ({ size = 14 }: Props) =>
  svg(
    size,
    <path
      d='M1.5 11.5Q5 3 14.5 2.5 12 5 13 6.5 10 7 11 8.8 7.5 9 8.5 11z'
      fill='#9fd3f5'
      stroke={INK}
      strokeWidth='0.7'
      strokeLinejoin='round'
    />,
  );

/** Дом: здания. */
export const BuildingIcon = ({ size = 14 }: Props) =>
  svg(
    size,
    <>
      <path
        d='M2 7.5 8 2.5l6 5'
        fill='#c46b4f'
        stroke={INK}
        strokeWidth='0.7'
        strokeLinejoin='round'
      />
      <rect
        x='3.5'
        y='7.2'
        width='9'
        height='6.8'
        fill='#dfe3d8'
        stroke={INK}
        strokeWidth='0.7'
      />
      <rect x='7' y='10' width='2.4' height='4' fill='#4a3a2c' />
    </>,
  );

/** Щит: физическая защита (броня). */
export const ArmorIcon = ({ size = 14 }: Props) =>
  svg(
    size,
    <path
      d='M8 1.5 13.5 3.5V8c0 3.3-2.5 5.6-5.5 6.5C5 13.6 2.5 11.3 2.5 8V3.5z'
      fill='#b8c3c8'
      stroke={INK}
      strokeWidth='0.8'
    />,
  );

/** Щит со звездой: магическая защита. */
export const MagicResistIcon = ({ size = 14 }: Props) =>
  svg(
    size,
    <>
      <path
        d='M8 1.5 13.5 3.5V8c0 3.3-2.5 5.6-5.5 6.5C5 13.6 2.5 11.3 2.5 8V3.5z'
        fill='#8f6fd6'
        stroke={INK}
        strokeWidth='0.8'
      />
      <path
        d='M8 4.6 8.9 7h2.4l-1.9 1.5.7 2.4L8 9.4l-2.1 1.5.7-2.4L4.7 7h2.4z'
        fill='#f3eaff'
      />
    </>,
  );

/** Искра: магический урон — броня не защищает. */
export const MagicDamageIcon = ({ size = 14 }: Props) =>
  svg(
    size,
    <path
      d='M8 1 9.6 6.4 15 8 9.6 9.6 8 15 6.4 9.6 1 8 6.4 6.4z'
      fill='#c9a8ff'
      stroke={INK}
      strokeWidth='0.6'
      strokeLinejoin='round'
    />,
  );

/** Прицел на крыле: может атаковать воздушные цели. */
export const HitsAirIcon = ({ size = 14 }: Props) =>
  svg(
    size,
    <>
      <path
        d='M3 10.5Q5.5 5 12 4.5 10.5 6.3 11.2 7.3 9.2 7.6 9.8 8.8 7.6 9 8.2 10.4z'
        fill='#9fd3f5'
        stroke={INK}
        strokeWidth='0.6'
      />
      <circle
        cx='8'
        cy='8'
        r='6.4'
        fill='none'
        stroke='#ff8a70'
        strokeWidth='1.2'
      />
      <path
        d='M8 0.6v2.2M8 13.2v2.2M0.6 8h2.2M13.2 8h2.2'
        stroke='#ff8a70'
        strokeWidth='1.2'
      />
    </>,
  );

/** Крыло над землёй: бьёт и землю, и воздух. */
export const HitsGroundAirIcon = ({ size = 14 }: Props) =>
  svg(
    size,
    <>
      <path
        d='M2.5 9Q5.5 2.5 13.5 2 11.5 4.3 12.4 5.6 9.8 6 10.6 7.5 7.8 7.7 8.5 9.3z'
        fill='#9fd3f5'
        stroke={INK}
        strokeWidth='0.6'
      />
      <path
        d='M1.5 13.2h13'
        stroke='#8bb36a'
        strokeWidth='2'
        strokeLinecap='round'
      />
    </>,
  );

const CATEGORY_ICONS: Record<TargetCategory, (props: Props) => ReactNode> = {
  infantry: InfantryIcon,
  ranged: RangedIcon,
  cavalry: CavalryIcon,
  siege: SiegeIcon,
  civil: CivilIcon,
  flying: FlyingIcon,
  building: BuildingIcon,
};

/**
 * Иконка с подсказкой: значение для чтения с экрана и всплывающий текст.
 *
 * @param label - Что означает иконка.
 */
export const IconHint = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <span role='img' aria-label={label} title={label}>
    {children}
  </span>
);

/** Иконка категории цели с подсказкой «против …». */
export const CategoryIcon = ({
  category,
  size = 14,
}: Props & { category: TargetCategory }) => {
  const Icon = CATEGORY_ICONS[category];
  return (
    <IconHint label={`против ${CATEGORY_AGAINST[category]}`}>
      <Icon size={size} />
    </IconHint>
  );
};
