import { describe, expect, it, vi, type Mock } from 'vite-plus/test';
import { AI_CONFIG, type CommandResult } from '@shared/config';
import { createAiMemory } from '@entities/ai-memories';
import type { AiAction, AiRule, Candidate } from '../model/types';
import { playTurn, type AiTurnDeps } from './playTurn';
import { grass, scene } from './scene.test-utils';

const rejected: CommandResult = {
  ok: false,
  kind: 'rejected',
  code: 'occupied',
  message: 'Клетка занята',
};

/** Правило-заглушка: предлагает движение, клетку задаёт шаг хода. */
const mover = (
  id: string,
  cell: (step: number) => number = () => 1,
  score = 50,
): AiRule => ({
  id,
  group: 'economy',
  title: id,
  evaluate: (ctx): Candidate[] => [
    {
      ruleId: id,
      group: 'economy',
      actorId: 'u1',
      action: { type: 'move', unitId: 'u1', x: cell(ctx.turn.step), y: 0 },
      score,
      reason: 'тест',
    },
  ],
});

type Execute = (action: AiAction) => CommandResult;

const succeed = () => vi.fn<Execute>(() => ({ ok: true }));
const reject = () => vi.fn<Execute>(() => rejected);

/** Зависимости хода: наблюдение неизменно, команды подменены. */
const deps = ({
  execute = succeed(),
  ...patch
}: Partial<Omit<AiTurnDeps, 'execute' | 'endTurn'>> & {
  execute?: Mock<Execute>;
} = {}) => {
  const { obs } = scene({ map: grass(6, 6) });
  return {
    memory: createAiMemory(7),
    observe: () => obs,
    isCancelled: () => false,
    endTurn: vi.fn(),
    rules: [] as AiRule[],
    ...patch,
    execute,
  };
};

describe('цикл хода ИИ', () => {
  it('без законных действий завершает ход с причиной', async () => {
    const turn = deps();

    const result = await playTurn(turn);

    expect(result).toMatchObject({
      commands: 0,
      reason: 'нет законных действий',
      cancelled: false,
    });
    expect(turn.execute).not.toHaveBeenCalled();
    expect(turn.endTurn).toHaveBeenCalledTimes(1);
  });

  it('отклонённое действие не повторяется в этом ходу', async () => {
    const turn = deps({
      rules: [mover('R1')],
      execute: reject(),
    });

    const result = await playTurn(turn);

    expect(turn.execute).toHaveBeenCalledTimes(1);
    expect(result.reason).toBe('нет законных действий');
    expect(turn.endTurn).toHaveBeenCalledTimes(1);
  });

  it('повторные отказы подряд завершают ход', async () => {
    const turn = deps({
      rules: [mover('R1', step => step)],
      execute: reject(),
      config: { ...AI_CONFIG, maxConsecutiveFailures: 3 },
    });

    const result = await playTurn(turn);

    expect(turn.execute).toHaveBeenCalledTimes(3);
    expect(result.reason).toBe('повторные отказы команд');
    expect(turn.endTurn).toHaveBeenCalledTimes(1);
  });

  it('предел команд не даёт ходу зависнуть', async () => {
    const turn = deps({
      rules: [mover('R1')],
      config: { ...AI_CONFIG, maxCommandsPerTurn: 4 },
    });

    const result = await playTurn(turn);

    expect(result).toMatchObject({
      commands: 4,
      reason: 'предел команд за ход',
    });
    expect(turn.endTurn).toHaveBeenCalledTimes(1);
  });

  it('устаревший запуск не завершает чужой ход', async () => {
    let cancelled = false;
    const turn = deps({
      rules: [mover('R1')],
      execute: vi.fn<Execute>(() => {
        cancelled = true;
        return { ok: true };
      }),
      isCancelled: () => cancelled,
    });

    const result = await playTurn(turn);

    expect(result).toMatchObject({ cancelled: true, commands: 1 });
    expect(turn.execute).toHaveBeenCalledTimes(1);
    expect(turn.endTurn).not.toHaveBeenCalled();
  });

  it('отдаёт управление браузеру порциями', async () => {
    const yieldControl = vi.fn(() => Promise.resolve());
    const turn = deps({
      rules: [mover('R1')],
      yieldControl,
      config: { ...AI_CONFIG, maxCommandsPerTurn: 6, yieldEvery: 2 },
    });

    await playTurn(turn);

    expect(yieldControl).toHaveBeenCalledTimes(3);
  });

  it('то же наблюдение и сид дают те же решения, журнал на них не влияет', async () => {
    const rules = [
      mover('R1', step => step % 3),
      mover('R2', step => (step + 1) % 3),
    ];
    const config = { ...AI_CONFIG, maxCommandsPerTurn: 5 };
    const record = vi.fn();
    const logged = deps({ rules, config, record });
    const silent = deps({ rules, config });

    await playTurn(logged);
    await playTurn(silent);

    expect(logged.execute.mock.calls).toEqual(silent.execute.mock.calls);
    expect(record).toHaveBeenCalledTimes(5);
    expect(record.mock.calls[0][0]).toMatchObject({
      step: 1,
      result: 'ok',
      strategy: expect.stringMatching(/^G\d\d /),
    });
  });

  it('журнал записывает и конец хода с причиной', async () => {
    const record = vi.fn();

    await playTurn(deps({ record }));

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleId: '—',
        result: 'endTurn',
        reason: 'нет законных действий',
      }),
    );
  });
});
