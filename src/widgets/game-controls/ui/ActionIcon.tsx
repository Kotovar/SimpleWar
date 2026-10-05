import type { ActionId, ResearchType } from '@shared/config';

/** Контуры в сетке 24×24, обводка цветом текста кнопки. */
const PATHS: Record<ActionId | `research:${ResearchType}`, string> = {
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
  // Исследования кузницы: щиты строя, карта, частокол, скрытый прицел, артель.
  'research:formation':
    'M3 5l5-2 5 2v6c0 4-2.5 6.5-5 8-2.5-1.5-5-4-5-8zM13 6.5l4-1.5 4 2v5c0 3.5-2 5.5-4 7-1-.6-2-1.4-2.7-2.4',
  'research:cartography': 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14',
  'research:engineering':
    'M5 21V7l2-3 2 3v14M15 21V7l2-3 2 3v14M3 11h18M3 16h18',
  'research:hiddenAiming':
    'M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM12 2v5M12 17v5M2 12h5M17 12h5M4 4l16 16',
  'research:artel':
    'M7 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 11c2-5 6-7 8-7s6 2 8 7M12 4v7',
};

/** Пиктограмма команды панели действий; неизвестный `id` — без значка. */
export const ActionIcon = ({
  id,
  size = 26,
}: {
  id: string;
  size?: number;
}) => {
  // Сначала точный `id` (исследование), затем действие без цели.
  const path =
    PATHS[id as keyof typeof PATHS] ??
    PATHS[id.split(':')[0] as keyof typeof PATHS];
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
