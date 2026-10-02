import { describe, expect, it } from 'vite-plus/test';
import { building, byId, input, unit } from './actions.test-utils';
import type { SelectionActionInput } from './actionButton';
import { getSelectionActions } from './selectionActions';

describe('кнопки рабочего', () => {
  it('рабочий: постоянный набор B G X C R, недоступное — с причиной', () => {
    const worker = unit('worker', { buildPoints: 1 });
    const buttons = getSelectionActions(input({ unit: worker }));

    expect(buttons.map(({ code }) => code)).toEqual([
      'KeyB',
      'KeyG',
      'KeyX',
      'KeyC',
      'KeyR',
    ]);
    const { work, unassign, repair } = byId(buttons);
    expect(work.reason).toMatch(/Рядом нет/);
    expect(unassign.reason).toBeTruthy();
    expect(repair.reason).toMatch(/повреждённых/);
  });

  it('стройка: слоты 1…0 по порядку, частокол — только после Инженерии', () => {
    const worker = unit('worker', { buildPoints: 1 });
    const build = (researched: SelectionActionInput['researched']) =>
      byId(getSelectionActions(input({ unit: worker, researched }))).build
        .children!;

    const plain = build([]);
    expect(plain[0].code).toBe('Digit1');
    expect(plain.some(({ id }) => id === 'build:palisade')).toBe(false);
    expect(
      build(['engineering']).some(({ id }) => id === 'build:palisade'),
    ).toBe(true);
  });

  it('без очка стройки: стройка и расчистка недоступны, но видны', () => {
    const worker = unit('worker', { buildPoints: 0 });
    const { build, clearForest } = byId(
      getSelectionActions(input({ unit: worker })),
    );
    expect(build.reason).toBe('Нет очка стройки');
    expect(clearForest.reason).toBe('Нет очка стройки');
  });

  it('работа: свободное место — цель в id, занятое — причина', () => {
    const worker = unit('worker');
    const mine = building('mine');
    const free = byId(
      getSelectionActions(input({ unit: worker, nearby: [mine] })),
    );
    expect(free.work).toMatchObject({ id: `work:${mine.id}` });
    expect(free.work.reason).toBeUndefined();

    const taken = byId(
      getSelectionActions(
        input({
          unit: worker,
          nearby: [mine],
          takenWorkplaces: new Set([mine.id]),
        }),
      ),
    );
    expect(taken.work.reason).toBeTruthy();
  });

  it('ремонт: самое повреждённое соседнее здание; без ресурсов — причина', () => {
    const worker = unit('worker', { buildPoints: 1 });
    const scratched = building('farm', 6, 5, { hp: 90, maxHp: 100 });
    const broken = building('tower', 4, 5, { hp: 10, maxHp: 100 });
    const nearby = [scratched, broken];

    expect(
      byId(getSelectionActions(input({ unit: worker, nearby }))).repair.id,
    ).toBe(`repair:${broken.id}`);
    expect(
      byId(
        getSelectionActions(
          input({ unit: worker, nearby, stock: { gold: 0, wood: 0 } }),
        ),
      ).repair.reason,
    ).toBeTruthy();
  });
});
