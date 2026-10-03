import { describe, expect, it } from 'vite-plus/test';
import { building, byId, input, unit } from './actions.test-utils';
import { getSelectionActions, unitStats } from './selectionActions';

describe('getSelectionActions', () => {
  it('осадная машина: удар уже подготовлен — причина; прицел включён — доступно', () => {
    const siege = unit('siege', { preparedStrike: { x: 1, y: 1 } });
    expect(getSelectionActions(input({ unit: siege }))[0].reason).toBe(
      'Удар уже подготовлен',
    );
    const ready = unit('siege', { attackPoints: 1 });
    expect(
      getSelectionActions(
        input({
          unit: ready,
          mode: { building: null, unit: null, clearing: false, striking: true },
        }),
      )[0],
    ).toMatchObject({ code: 'KeyQ', pressed: true, reason: undefined });
  });

  it('у бойца есть пропуск и сон, при сне — пробуждение', () => {
    expect(
      getSelectionActions(input({ unit: unit('archer') })).map(b => [
        b.id,
        b.code,
      ]),
    ).toEqual([
      ['skip', 'Space'],
      ['sleep', 'KeyF'],
    ]);
    const buttons = byId(
      getSelectionActions(
        input({ unit: unit('worker', { restMode: 'sleep' }) }),
      ),
    );
    expect(buttons.sleep).toMatchObject({
      label: 'Разбудить',
      code: 'KeyF',
      pressed: true,
    });
  });

  it('казармы: найм цифрами и снос; ратушу снести нельзя', () => {
    const barracks = getSelectionActions(
      input({ building: building('barracks') }),
    );
    expect(barracks.map(({ id, code }) => [id, code])).toEqual([
      ['spawn:swordsman', 'Digit1'],
      ['spawn:archer', 'Digit2'],
      ['spawn:spearman', 'Digit3'],
      ['rallyPoint', 'KeyT'],
      ['cancelOrder', 'KeyU'],
      ['demolish', 'Delete'],
    ]);
    expect(
      getSelectionActions(input({ building: building('base') })).some(
        ({ id }) => id === 'demolish',
      ),
    ).toBe(false);
  });

  it('найм без лимита населения — причина у слота', () => {
    const [first] = getSelectionActions(
      input({
        building: building('barracks'),
        population: { occupied: 10, max: 10 },
      }),
    );
    expect(first.reason).toBeTruthy();
  });

  it('кузница: идёт исследование — остальные недоступны, есть отмена', () => {
    const buttons = getSelectionActions(
      input({ building: building('forge'), researching: 'formation' }),
    );
    const research = buttons.filter(({ id }) => id.startsWith('research:'));
    expect(research.find(({ pressed }) => pressed)?.id).toBe(
      'research:formation',
    );
    expect(
      research
        .filter(({ id }) => id !== 'research:formation')
        .every(b => b.reason),
    ).toBe(true);
    expect(buttons.some(({ id }) => id === 'cancelResearch')).toBe(true);
  });

  it('рудник: без рабочего внутри выбор и снятие недоступны', () => {
    const { pickWorker, unassign } = byId(
      getSelectionActions(input({ building: building('mine') })),
    );
    expect(pickWorker.reason).toBe('Внутри нет рабочего');
    expect(unassign.reason).toBe('Внутри нет рабочего');
  });

  it('чужой ход: все кнопки и слоты недоступны', () => {
    const buttons = getSelectionActions(
      input({ unit: unit('worker', { buildPoints: 1 }), isTurn: false }),
    );
    expect(buttons.every(({ reason }) => reason === 'Сейчас не ваш ход')).toBe(
      true,
    );
    expect(
      byId(buttons).build.children!.every(
        ({ reason }) => reason === 'Сейчас не ваш ход',
      ),
    ).toBe(true);
  });

  it('подсказка найма: у рабочего нет лечения, у лекаря — +20 HP', () => {
    expect(unitStats('worker')).not.toMatch(/лечение|undefined/);
    expect(unitStats('healer')).toContain('лечение +20 HP');
    expect(unitStats('siege')).toContain('дальность 2–5');
  });
});
