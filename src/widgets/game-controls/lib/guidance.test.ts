import { describe, expect, it } from 'vite-plus/test';
import type { JournalEntry } from '@entities/journals';
import { completedBy, summaryItem } from './guidance';

const event = (
  type: JournalEntry['type'],
  details: JournalEntry['details'] = {},
): JournalEntry => ({
  id: 1,
  gameId: 1,
  turn: 1,
  actor: 'p1',
  visibleTo: ['p1'],
  type,
  details,
});

describe('снимки помощника', () => {
  it('различает движение разведчика, найм и постройку', () => {
    expect(completedBy(event('move', { unitType: 'scout' }), 'p1')).toEqual([
      'controls',
      'scout',
    ]);
    expect(completedBy(event('spawn'), 'p1')).toEqual(['spawn']);
    expect(completedBy(event('build'), 'p1')).toEqual(['build']);
    expect(completedBy(event('spawn'), 'p2')).toEqual([]);
  });
  it('отличает потери от сноса и не включает чужие потери', () => {
    expect(
      summaryItem(
        event('buildingDestroyed', {
          owner: 'p1',
          buildingType: 'farm',
          demolished: 1,
        }),
        'p1',
      ),
    ).toBeNull();
    expect(
      summaryItem(
        event('unitDestroyed', { owner: 'p2', unitType: 'worker' }),
        'p1',
      ),
    ).toBeNull();
    expect(
      summaryItem(
        event('buildingDestroyed', {
          owner: 'p1',
          buildingType: 'farm',
          x: 2,
          y: 4,
        }),
        'p1',
      ),
    ).toMatchObject({ position: { x: 2, y: 4 } });
  });
});
