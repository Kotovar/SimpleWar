import {
  afterAll,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import type { Participant, Unit } from '@shared/config';
import { audio, gameEvents } from '@shared/lib';
import { useGameLoopStore } from '@entities/games';
import { createUnit } from '@entities/units';
import { createBuilding } from '@entities/buildings';
import { initAudioSystem } from './audio';

const musicState = vi.spyOn(audio, 'setMusicState');

const participants: Participant[] = [
  { id: 'p1', controller: 'human', team: 1 },
  { id: 'p2', controller: 'ai', team: 2 },
  { id: 'p3', controller: 'ai', team: 1 },
];

beforeAll(() => {
  vi.stubGlobal('document', { addEventListener: vi.fn() });
  initAudioSystem();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  musicState.mockClear();
  useGameLoopStore.setState({
    phase: 'inProgress',
    currentTurn: 3,
    activePlayer: 'p2',
    participants,
    winner: null,
  });
  gameEvents.emit({ type: 'GAME_RESET' });
});

afterAll(() => vi.restoreAllMocks());

const hit = (owner: Unit['owner'] = 'p1', damage = 10) =>
  gameEvents.emit({
    type: 'ATTACK_LANDED',
    target: createUnit('worker', 1, 1, owner, false)!,
    damage,
  });

it('появление разведчика без нападения не разрешает боевую тему', () => {
  expect(musicState).toHaveBeenLastCalledWith(
    expect.objectContaining({ recentAttack: false }),
  );
});

it.each(['p1', 'p3'] as const)(
  'попадание по юниту %s разрешает бой на текущий и следующий круг',
  owner => {
    hit(owner);
    expect(musicState).toHaveBeenLastCalledWith(
      expect.objectContaining({ recentAttack: true }),
    );
    useGameLoopStore.setState({ currentTurn: 4 });
    expect(musicState).toHaveBeenLastCalledWith(
      expect.objectContaining({ recentAttack: true }),
    );
    useGameLoopStore.setState({ currentTurn: 5 });
    expect(musicState).toHaveBeenLastCalledWith(
      expect.objectContaining({ recentAttack: false }),
    );
  },
);

it('новое попадание продлевает бой, сброс партии очищает историю', () => {
  hit();
  useGameLoopStore.setState({ currentTurn: 4 });
  hit();
  useGameLoopStore.setState({ currentTurn: 5 });
  expect(musicState).toHaveBeenLastCalledWith(
    expect.objectContaining({ recentAttack: true }),
  );
  gameEvents.emit({ type: 'GAME_RESET' });
  expect(musicState).toHaveBeenLastCalledWith(
    expect.objectContaining({ recentAttack: false }),
  );
});

it('удар по врагу, зданию, без урона и дружественный огонь не разрешают бой', () => {
  hit('p2');
  hit('p1', 0);
  gameEvents.emit({
    type: 'ATTACK_LANDED',
    target: createBuilding('base', 1, 1, 'p1')!,
    damage: 10,
  });
  useGameLoopStore.setState({ activePlayer: 'p3' });
  hit();
  expect(musicState).toHaveBeenLastCalledWith(
    expect.objectContaining({ recentAttack: false }),
  );
});

it('загрузка другого круга и выход из партии сбрасывают разрешение боя', () => {
  hit();
  useGameLoopStore.setState({ currentTurn: 1 });
  expect(musicState).toHaveBeenLastCalledWith(
    expect.objectContaining({ recentAttack: false }),
  );
  hit();
  useGameLoopStore.setState({ phase: 'gameOver', winner: 'p1' });
  expect(musicState).toHaveBeenLastCalledWith(
    expect.objectContaining({ recentAttack: false, outcome: 'victory' }),
  );
});
