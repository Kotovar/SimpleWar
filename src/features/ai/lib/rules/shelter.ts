import { isAdjacent } from '@shared/lib';
import type { AiRule } from '../../model/types';
import type { AiContext } from '../context';
import { baseAlarm, hasDefenders } from '../facts';
import { around } from '../geometry';
import { isFree } from './common';

/** Рабочий, укрытый в своей ратуше. */
export const shelteredWorker = (ctx: AiContext) =>
  ctx.base
    ? ctx.workers.find(({ workplaceId }) => workplaceId === ctx.base?.id)
    : undefined;

/**
 * W12: враг у рабочего, а своих бойцов у ратуши нет — спрятать соседнего
 * рабочего в ратушу (место одно). Тревоги нет и вокруг ратуши безопасно —
 * выпустить его на работу.
 */
export const W12: AiRule = {
  id: 'W12',
  group: 'defense',
  title: 'Укрытие рабочего в ратуше',
  evaluate: ctx => {
    const { base } = ctx;
    if (!base) return [];
    const inside = shelteredWorker(ctx);
    if (inside) {
      if (!isFree(ctx, inside.id) || baseAlarm(ctx).length) return [];
      // Выходит только на безопасную клетку: иначе снова спрячется в том же
      // ходу — и так без конца.
      if (around(base).some(cell => ctx.threatAt(cell) > 0)) return [];
      return [
        {
          ruleId: 'W12',
          group: 'defense',
          actorId: inside.id,
          action: { type: 'unassign', workerId: inside.id },
          score: 45,
          reason: 'угроза миновала: выпускаю рабочего из ратуши',
        },
      ];
    }
    // Защищает только боец с атакой: не разведчик и не лекарь.
    if (hasDefenders(ctx)) return [];
    const worker = ctx.workers
      .filter(
        w =>
          // Строитель тоже прячется: стройка продолжится после выхода.
          isFree(ctx, w.id) &&
          !w.workplaceId &&
          isAdjacent(w, base) &&
          ctx.threatAt(w) > 0,
      )
      .sort((a, b) => ctx.threatAt(b) - ctx.threatAt(a))[0];
    if (!worker) return [];
    return [
      {
        ruleId: 'W12',
        group: 'defense',
        actorId: worker.id,
        action: { type: 'assign', workerId: worker.id, buildingId: base.id },
        score: 95,
        reason: 'враг рядом, защиты нет: прячу рабочего в ратушу',
        basis: { danger: ctx.threatAt(worker) },
      },
    ];
  },
};
