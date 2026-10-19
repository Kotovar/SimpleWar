import type { Participant, ParticipantId, Phase } from '@shared/config';

/**
 * Ходит ИИ при человеке за экраном. Пока это верно, индикатор и его время
 * не перезапускаются, даже если ход переходит от одного ИИ к другому.
 */
export const isEnemyTurn = ({
  phase,
  participants,
  activePlayer,
}: {
  phase: Phase;
  participants: readonly Participant[];
  activePlayer: ParticipantId;
}) =>
  phase === 'inProgress' &&
  participants.some(p => p.controller === 'human') &&
  participants.find(p => p.id === activePlayer)?.controller === 'ai';
