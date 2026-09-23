import { GAME_TITLE } from '@shared/config';
import { useGameLoopSelectors } from '@features/game-loop';
import { OverlayCanvas } from './OverlayCanvas';

export const StartGameCanvas = () => {
  const { phase } = useGameLoopSelectors();

  return phase === 'setup' ? (
    <OverlayCanvas title={GAME_TITLE} hint='Нажмите "Начать игру" для старта' />
  ) : null;
};
