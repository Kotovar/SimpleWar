import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { DEFAULT_PARTICIPANTS, type Unit } from '@shared/config';
import { useMapStore } from '@entities/maps';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useKnowledgeStore } from '@entities/perceptions';
import { useGameLoopStore } from '@entities/games';
import { useHoverPath } from './useHoverPath';

let unit: Unit;
beforeEach(() => {
  useUnitsStore.setState({ units: {} });
  useBuildingsStore.setState({ buildings: {} });
  useKnowledgeStore.getState().resetStore();
  useGameLoopStore.setState({
    phase: 'inProgress',
    activePlayer: 'p1',
    participants: DEFAULT_PARTICIPANTS,
    eliminated: [],
  });
  useMapStore.setState({
    grid: [
      Array.from({ length: 25 }, (_, x) => ({
        x,
        y: 0,
        type: 'grass',
        isWalkable: true,
      })),
    ],
  });
  const id = useUnitsStore.getState().spawnUnit('scout', 0, 0, 'p1')!;
  useUnitsStore.getState().resetUnitsForNewTurn('p1');
  unit = useUnitsStore.getState().units[id];
});

const preview = (
  actor: Unit,
  planned: { unitId: string; x: number; y: number } | null,
) => {
  let route: ReturnType<typeof useHoverPath> = null;
  const Probe = () => {
    route = useHoverPath(
      { x: 10, y: 0 },
      { kind: 'unit', id: actor.id },
      { [actor.id]: actor },
      'p1',
      planned,
    );
    return null;
  };
  renderToString(createElement(Probe));
  return route as ReturnType<typeof useHoverPath>;
};

describe('предпросмотр нового намерения при сохраняемом приказе', () => {
  it.each(['explore', 'build', 'work'] as const)(
    'отметка подтверждения имеет приоритет над %s',
    type => {
      const order =
        type === 'build'
          ? { type, buildingType: 'mine' as const, x: 20, y: 0 }
          : type === 'work'
            ? { type, buildingId: 'mine', x: 20, y: 0 }
            : { type, x: 20, y: 0 };
      const route = preview(
        { ...unit, order },
        { unitId: unit.id, x: 11, y: 0 },
      );
      expect(route?.path.at(-1)).toEqual({ x: 11, y: 0 });
    },
  );
  it('остановленный приказ разрешает обычный hover', () => {
    expect(
      preview(
        { ...unit, order: { type: 'explore', x: 20, y: 0, stopped: 'enemy' } },
        null,
      )?.path.at(-1),
    ).toEqual({ x: 10, y: 0 });
  });
});
