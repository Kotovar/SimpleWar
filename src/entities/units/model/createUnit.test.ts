import { describe, expect, it } from 'vite-plus/test';
import {
  CIVIL_UNITS_CONFIG,
  MILITARY_UNITS_CONFIG,
  UnitType,
} from '@shared/config';
import { createUnit } from './createUnit';

const unitCases = [
  {
    type: 'swordsman',
    role: 'military',
    config: MILITARY_UNITS_CONFIG.swordsman,
    x: 2,
    y: 5,
    owner: 'p1',
  },
  {
    type: 'archer',
    role: 'military',
    config: MILITARY_UNITS_CONFIG.archer,
    x: 3,
    y: 6,
    owner: 'p2',
  },
  {
    type: 'worker',
    role: 'civil',
    config: CIVIL_UNITS_CONFIG.worker,
    x: 4,
    y: 7,
    owner: 'p1',
  },
] as const;

describe('createUnit', () => {
  it.each(unitCases)(
    'создаёт нанятого юнита $type из его конфига',
    ({ type, role, config, x, y, owner }) => {
      const unit = createUnit(type, x, y, owner, false);

      expect(unit).toMatchObject({
        ...config,
        id: expect.stringMatching(/^unit_.+/),
        type,
        x,
        y,
        owner,
        hp: config.maxHp,
        role,
      });
    },
  );

  it('даёт стартовому рабочему полные очки хода и строительства', () => {
    const { maxMovePoints, maxBuildPoints } = CIVIL_UNITS_CONFIG.worker;

    expect(createUnit('worker', 0, 0, 'p1', true)).toMatchObject({
      movePoints: maxMovePoints,
      buildPoints: maxBuildPoints,
    });
  });

  it('даёт стартовому военному полные очки хода', () => {
    const { maxMovePoints, attackPoints } = MILITARY_UNITS_CONFIG.archer;

    expect(createUnit('archer', 0, 0, 'p2', true)).toMatchObject({
      movePoints: maxMovePoints,
      attackPoints,
    });
  });

  it('возвращает null для неизвестного типа', () => {
    expect(createUnit('unknown' as UnitType, 0, 0, 'p1', false)).toBeNull();
  });
});
