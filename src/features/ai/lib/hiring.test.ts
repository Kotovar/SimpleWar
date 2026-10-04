import { describe, expect, it } from 'vite-plus/test';
import { savingGoals } from './saving';
import { foe, grass, own, ownBuilding, scene } from './scene.test-utils';
import { N01, N02 } from './rules/production';

/** Накопление и найм новых ролей: бюджет не уходит целиком на мечников. */

const map = grass(12, 12);
const army = (n: number) =>
  Array.from({ length: n }, (_, i) => own('swordsman', i, 11));

describe('savingGoals: здание найма для роли', () => {
  it('нужна осада, мастерской нет — копит на мастерскую', () => {
    const { ctx } = scene({
      map,
      units: [own('worker', 1, 1), own('worker', 2, 1), ...army(4)],
      buildings: [ownBuilding('base', 5, 5), ownBuilding('barracks', 8, 8)],
      enemies: [foe('base', 11, 0)],
    });

    expect(savingGoals(ctx).map(({ key }) => key)).toContain('workshop');
  });

  it('есть кого нанять в готовом здании — копит на юнита, не на новое здание', () => {
    const { ctx } = scene({
      map,
      units: [own('worker', 1, 1), own('worker', 2, 1), ...army(4)],
      buildings: [
        ownBuilding('base', 5, 5),
        ownBuilding('barracks', 8, 8),
        ownBuilding('workshop', 8, 5),
      ],
      enemies: [foe('base', 11, 0)],
      // Желаемая армия на 30-м ходу больше 4: цель «армия» активна.
      turn: 30,
    });

    const keys = savingGoals(ctx).map(({ key }) => key);

    expect(keys).not.toContain('sanctuary');
    expect(savingGoals(ctx).find(({ key }) => key === 'army')?.cost).toEqual({
      gold: 300,
      wood: 150,
    });
  });
});

describe('N02 ждёт нужную роль', () => {
  it('осада накопится за пару ходов — мечника не покупает', () => {
    const { ctx } = scene({
      map,
      units: [own('worker', 1, 1), own('worker', 2, 1), ...army(4)],
      buildings: [
        ownBuilding('base', 5, 5),
        ownBuilding('barracks', 8, 8),
        ownBuilding('workshop', 8, 5),
      ],
      enemies: [foe('base', 11, 0)],
      // Не хватает 9 золота при доходе ратуши 3 за ход: 3 хода ожидания.
      stock: { gold: 141, wood: 200 },
      turn: 30,
    });

    expect(N02.evaluate(ctx)).toEqual([]);
  });
});

describe('найм под угрозой при срочной обороне', () => {
  const setup = (strategy: 'G01' | 'G04') =>
    scene({
      map,
      units: [own('worker', 5, 4)],
      buildings: [ownBuilding('base', 5, 5)],
      // Мечник врага достаёт все клетки вокруг ратуши.
      enemies: [foe('swordsman', 7, 5)],
      memory: { strategy },
    }).ctx;

  it('без G01 в клетку под угрозой не нанимает', () => {
    expect(N01.evaluate(setup('G04'))).toEqual([]);
  });

  it('при G01 нанимает в наименее опасную клетку', () => {
    expect(N01.evaluate(setup('G01'))).toMatchObject([
      { action: { type: 'spawn', unitType: 'worker' } },
    ]);
  });
});
