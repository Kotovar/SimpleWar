import { describe, expect, it } from 'vite-plus/test';
import type { AiRule, Candidate } from '../model/types';
import { actionKey, decideStep } from './decide';
import { grass, scene } from './scene.test-utils';

describe('выбор действия шага', () => {
  const offer =
    (group: Candidate['group'], score: number, x = 1): AiRule['evaluate'] =>
    () => [
      {
        ruleId: `R-${group}-${x}`,
        group,
        actorId: 'u1',
        action: { type: 'move', unitId: 'u1', x, y: 0 },
        score,
        reason: 'тест',
      },
    ];
  const rule = (
    id: string,
    group: Candidate['group'],
    evaluate: AiRule['evaluate'],
  ): AiRule => ({ id, group, title: id, evaluate });
  const economy = rule('E', 'economy', offer('economy', 50, 1));
  const attack = rule('A', 'attack', offer('attack', 60, 2));

  it('стратегия меняет выбор весом группы', () => {
    const economic = scene({ map: grass(4, 4), memory: { strategy: 'G02' } });
    const offensive = scene({ map: grass(4, 4), memory: { strategy: 'G08' } });

    expect(decideStep(economic.ctx, [economy, attack]).chosen?.group).toBe(
      'economy',
    );
    expect(decideStep(offensive.ctx, [economy, attack]).chosen?.group).toBe(
      'attack',
    );
  });

  it('при равных оценках выбор воспроизводим и не зависит от порядка правил', () => {
    const tiedA = rule('A', 'economy', offer('economy', 50, 1));
    const tiedB = rule('B', 'economy', offer('economy', 50, 2));
    const { ctx } = scene({ map: grass(4, 4) });

    const first = decideStep(ctx, [tiedA, tiedB]).chosen?.ruleId;

    expect(decideStep(ctx, [tiedA, tiedB]).chosen?.ruleId).toBe(first);
    expect(decideStep(ctx, [tiedB, tiedA]).chosen?.ruleId).toBe(first);
  });

  it('пропускает отклонённое в этом ходу действие и закончившего ход', () => {
    const { ctx } = scene({ map: grass(4, 4) });
    const first = decideStep(ctx, [economy, attack]).chosen!;
    ctx.turn.failed.add(actionKey(first));

    expect(decideStep(ctx, [economy, attack]).chosen?.ruleId).not.toBe(
      first.ruleId,
    );

    ctx.turn.done.add('u1');
    expect(decideStep(ctx, [economy, attack])).toMatchObject({
      chosen: null,
      endReason: 'нет законных действий',
    });
  });

  it('ожидание и слабые действия не выполняются', () => {
    const { ctx } = scene({ map: grass(4, 4) });
    const wait = rule('W', 'defense', () => [
      {
        ruleId: 'W',
        group: 'defense',
        actorId: 't1',
        action: { type: 'wait', actorId: 't1' },
        score: 100,
        reason: 'тест',
      },
    ]);
    const weak = rule('Z', 'economy', offer('economy', 0.1));

    expect(decideStep(ctx, [wait, weak])).toMatchObject({
      chosen: null,
      endReason: 'нет полезных действий',
    });
  });
});
