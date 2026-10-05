import type { ActionId } from '@shared/config';

/** Контуры в сетке 24×24, обводка цветом текста кнопки. */
const PATHS: Record<ActionId | 'research', string> = {
  explore:
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5 13.2 13.2 8.5 15.5 10.8 10.8z',
  rallyPoint: 'M5 21V4M5 4h12l-2.5 4L17 12H5',
  cancelOrder: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 9l6 6M15 9l-6 6',
  skip: 'M5 5l7 7-7 7M13 5l7 7-7 7',
  sleep: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5zM15 4h4l-4 4h4',
  build: 'M3 21l9.5-9.5M10.5 6.5 15 2l7 7-4.5 4.5zM13 9l2 2',
  work: 'M14 10 4 20M5 7.5C9 4 15 4 20 8.5 15.5 7.5 11.5 8 8.5 10.5z',
  unassign: 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10',
  clearForest:
    'M4 21 14.5 10.5M12 8c2-3 6-4 9-2-1 3-3 5-6 6.5zM8 3l2 4-4 2-2-4z',
  repair:
    'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z',
  prepareStrike:
    'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 1v6M12 17v6M1 12h6M17 12h6M12 11.5v1',
  pickWorker: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c0-4 3.5-6 8-6s8 2 8 6',
  cancelResearch: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 9l6 6M15 9l-6 6',
  demolish: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5',
  research:
    'M9 3h6M10 3v6l-5.5 9.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3M7 15h10',
};

/** Пиктограмма команды панели действий; неизвестный `id` — без значка. */
export const ActionIcon = ({
  id,
  size = 26,
}: {
  id: string;
  size?: number;
}) => {
  const path = PATHS[id.split(':')[0] as keyof typeof PATHS];
  if (!path) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={1.8}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
};
