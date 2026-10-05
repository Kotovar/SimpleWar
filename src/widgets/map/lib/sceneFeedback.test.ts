import { describe, expect, it } from 'vite-plus/test';
import { getCommandEffect } from './sceneFeedback';

describe('эффект расчистки', () => {
  const command = {
    type: 'clearForest' as const,
    actor: 'p1' as const,
    details: { x: 4, y: 7 },
  };

  it('показывает эффект только для видимой расчистки', () => {
    expect(
      getCommandEffect(command, (x, y) => x === 4 && y === 7, 100),
    ).toEqual({ x: 4, y: 7, clearing: true, start: 100 });
    expect(getCommandEffect(command, () => false, 100)).toBeNull();
  });

  it('не показывает расчистку для других команд и без координат', () => {
    expect(
      getCommandEffect({ ...command, type: 'move' }, () => true, 0),
    ).toBeNull();
    expect(
      getCommandEffect({ type: 'clearForest', actor: 'p1' }, () => true, 0),
    ).toBeNull();
  });
});
