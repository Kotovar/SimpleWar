import { expect, it } from 'vite-plus/test';
import {
  BUILDINGS_CONFIG,
  UNITS_CONFIG,
  type Building,
  type Unit,
  type Participant,
} from '@shared/config';
import { getConcealedIds, isScoutExposed } from './concealment';

const participants: Participant[] = [
  { id: 'p1', controller: 'human', team: 1 },
  { id: 'p2', controller: 'ai', team: 2 },
  { id: 'p3', controller: 'ai', team: 1 },
];
const scout: Unit = {
  ...UNITS_CONFIG.scout,
  type: 'scout',
  role: 'military',
  id: 'scout',
  owner: 'p1',
  x: 5,
  y: 5,
  hp: 45,
  concealed: true,
};
const enemy: Unit = { ...scout, id: 'enemy', owner: 'p2', x: 5, y: 7 };

it('маскировка работает на расстоянии 2 и по диагонали, соседство раскрывает даже двух скрытых врагов', () => {
  expect([...getConcealedIds('p2', [scout, enemy], [], participants)]).toEqual([
    'scout',
  ]);
  expect(isScoutExposed(scout, [{ ...enemy, x: 6, y: 6 }], participants)).toBe(
    false,
  );
  expect([
    ...getConcealedIds('p2', [scout, { ...enemy, y: 6 }], [], participants),
  ]).toEqual([]);
});

it('свои и союзные разведчики видимы, союзник вплотную не раскрывает их врагу', () => {
  const ally: Unit = { ...scout, id: 'ally', owner: 'p3', y: 6 };
  expect([...getConcealedIds('p1', [scout, ally], [], participants)]).toEqual(
    [],
  );
  expect([...getConcealedIds('p3', [scout, ally], [], participants)]).toEqual(
    [],
  );
  expect([...getConcealedIds('p2', [scout, ally], [], participants)]).toEqual([
    'scout',
    'ally',
  ]);
});

it('вражеское здание с обзором рядом раскрывает, объект без обзора — нет', () => {
  const base: Building = {
    ...BUILDINGS_CONFIG.base,
    type: 'base',
    role: 'production',
    id: 'base',
    owner: 'p2',
    x: 5,
    y: 6,
    hp: 700,
  };
  expect([...getConcealedIds('p2', [scout], [base], participants)]).toEqual([]);
  expect([
    ...getConcealedIds(
      'p2',
      [scout],
      [{ ...base, sightRange: 0 }],
      participants,
    ),
  ]).toEqual(['scout']);
});
