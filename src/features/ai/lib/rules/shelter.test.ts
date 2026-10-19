import { describe, expect, it } from 'vite-plus/test';
import { foe, grass, own, ownBuilding, scene } from '../scene.test-utils';
import { continueBuilds } from './building';
import { W12 } from './shelter';

describe('W12: укрытие рабочего в ратуше', () => {
  const base = () => ownBuilding('base', 5, 5);

  it('враг у рабочего, защиты нет — прячет соседнего рабочего', () => {
    const hall = base();
    const worker = own('worker', 5, 6);
    const { ctx } = scene({
      map: grass(12, 12),
      units: [worker],
      buildings: [hall],
      enemies: [foe('scout', 5, 7)],
    });

    expect(W12.evaluate(ctx)).toMatchObject([
      {
        action: { type: 'assign', workerId: worker.id, buildingId: hall.id },
      },
    ]);
  });

  it('прячет и строителя с задачей; лекарь защитником не считается', () => {
    const hall = base();
    const worker = own('worker', 5, 6, { movePoints: 0 });
    const { ctx } = scene({
      map: grass(12, 12),
      units: [worker, own('healer', 6, 6)],
      buildings: [hall],
      enemies: [foe('rider', 5, 7)],
      memory: {
        tasks: [
          {
            id: 't1',
            kind: 'build',
            ruleId: 'W05',
            unitId: worker.id,
            target: { x: 1, y: 1 },
            buildingType: 'mine',
            reserve: { gold: 120, wood: 0 },
            createdTurn: 1,
            reviewTurn: 9,
          },
        ],
      },
    });

    expect(W12.evaluate(ctx)).toMatchObject([
      { action: { type: 'assign', workerId: worker.id } },
    ]);
  });

  it('укрытый строитель не продолжает стройку, пока его не выпустят', () => {
    const hall = base();
    const hider = own('worker', 5, 5, { workplaceId: hall.id });
    const { ctx } = scene({
      map: grass(12, 12),
      units: [hider],
      buildings: [hall],
      enemies: [foe('rider', 5, 8)],
      memory: {
        tasks: [
          {
            id: 't1',
            kind: 'build',
            ruleId: 'W05',
            unitId: hider.id,
            target: { x: 1, y: 1 },
            buildingType: 'farm',
            reserve: { gold: 60, wood: 160 },
            createdTurn: 1,
            reviewTurn: 9,
          },
        ],
      },
    });

    expect(continueBuilds(ctx, 'W05', 'build', 60)).toEqual([]);
  });

  it('свой боец у ратуши — не прячет; дальний рабочий — тоже нет', () => {
    const guarded = scene({
      map: grass(12, 12),
      units: [own('worker', 5, 6), own('swordsman', 6, 6)],
      buildings: [base()],
      enemies: [foe('scout', 5, 7)],
    });
    expect(W12.evaluate(guarded.ctx)).toEqual([]);

    const far = scene({
      map: grass(12, 12),
      units: [own('worker', 9, 9)],
      buildings: [base()],
      enemies: [foe('scout', 9, 10)],
    });
    expect(W12.evaluate(far.ctx)).toEqual([]);
  });

  it('угроза ушла — выпускает; пока враг рядом — держит внутри', () => {
    const hall = base();
    const hider = own('worker', 5, 5, { workplaceId: hall.id });
    const calm = scene({
      map: grass(12, 12),
      units: [hider],
      buildings: [hall],
    });
    expect(W12.evaluate(calm.ctx)).toMatchObject([
      { action: { type: 'unassign', workerId: hider.id } },
    ]);

    const raid = scene({
      map: grass(12, 12),
      units: [hider],
      buildings: [hall],
      enemies: [foe('scout', 5, 7)],
    });
    expect(W12.evaluate(raid.ctx)).toEqual([]);

    // Разведчик достаёт (ход 5 + удар 1) клетку у ратуши, но не её саму и
    // вне радиуса тревоги: выход сразу вернул бы рабочего под угрозу.
    const edge = scene({
      map: grass(16, 16),
      units: [hider],
      buildings: [hall],
      enemies: [foe('scout', 5, 12)],
    });
    expect(edge.ctx.threatAt(hall)).toBe(0);
    expect(W12.evaluate(edge.ctx)).toEqual([]);
  });
});
