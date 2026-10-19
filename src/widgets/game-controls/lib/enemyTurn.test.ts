import { describe, expect, it } from 'vite-plus/test';
import {
  getParticipantGenitive,
  type Participant,
  type ParticipantId,
} from '@shared/config';
import { isEnemyTurn } from './enemyTurn';

const participants: Participant[] = [
  { id: 'p1', controller: 'human' },
  { id: 'p2', controller: 'ai', palette: 'red' },
  { id: 'p3', controller: 'ai', palette: 'yellow' },
  { id: 'p4', controller: 'ai', palette: 'green' },
];
const at = (activePlayer: ParticipantId, phase = 'inProgress' as const) => ({
  phase,
  participants,
  activePlayer,
});

describe('индикатор хода врагов (M4)', () => {
  it('непрерывен на переходах ИИ → ИИ и гаснет на ходу человека', () => {
    expect(
      (['p2', 'p3', 'p4', 'p1'] as const).map(id => isEnemyTurn(at(id))),
    ).toEqual([true, true, true, false]);
    expect(isEnemyTurn({ ...at('p2'), phase: 'gameOver' })).toBe(false);
    expect(
      isEnemyTurn({
        ...at('p2'),
        participants: participants.map(p => ({ ...p, controller: 'ai' })),
      }),
    ).toBe(false);
  });

  it('называет текущую сторону в родительном падеже', () => {
    expect(
      (['p1', 'p3', 'p4'] as const).map(id =>
        getParticipantGenitive(id, participants),
      ),
    ).toEqual(['Синих', 'Жёлтых', 'Зелёных']);
  });
});
