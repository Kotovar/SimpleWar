import type { AiMemory } from '@entities/ai-memories';
import type { Candidate, TurnState } from '../model/types';
import type { AiContext } from './context';
import { chebyshev } from './geometry';
import { planOperation } from './operation';
import { chooseStrategy, evaluateStrategies } from './strategy';

/** Пустое состояние нового хода. */
export const createTurnState = (): TurnState => ({
  done: new Set(),
  failed: new Set(),
  plannedDamage: new Map(),
  step: 0,
});

/** Задача ещё имеет смысл: исполнитель жив, срок не истёк, цель актуальна. */
const isTaskAlive = (ctx: AiContext, task: AiMemory['tasks'][number]) => {
  const unit = ctx.obs.ownUnits.find(({ id }) => id === task.unitId);
  if (!unit || task.reviewTurn < ctx.obs.turn) return false;
  const { x, y } = task.target;
  if (task.kind === 'build') {
    // Площадку заняли (построено или стоит объект) — задача закрыта.
    return !ctx.occupied(x, y);
  }
  // Разведка закончена, когда цель больше не граница или юнит пришёл.
  const stillFrontier = ctx.frontier.some(c => c.x === x && c.y === y);
  return stillFrontier && chebyshev(unit, task.target) > 1;
};

/**
 * Пересматривает память перед шагом: чистит задачи, запоминает места работы,
 * выбирает стратегию и обновляет операцию. Чистая функция.
 *
 * @returns Новая память и оценки стратегий для журнала.
 */
export const refreshMemory = (ctx: AiContext) => {
  const tasks = ctx.memory.tasks.filter(task => isTaskAlive(ctx, task));
  const alive = new Set(ctx.obs.ownUnits.map(({ id }) => id));
  const lastWorkplace = Object.fromEntries(
    Object.entries(ctx.memory.lastWorkplace).filter(([id]) => alive.has(id)),
  );
  for (const worker of ctx.workers) {
    const place = ctx.obs.ownBuildings.find(
      ({ id }) => id === worker.workplaceId,
    );
    if (place) {
      lastWorkplace[worker.id] = {
        buildingId: place.id,
        type: place.type,
        x: place.x,
        y: place.y,
      };
    }
  }

  const cleaned: AiContext = {
    ...ctx,
    memory: { ...ctx.memory, tasks, lastWorkplace },
  };
  const scores = evaluateStrategies(cleaned);
  const { memory: withStrategy, chosen } = chooseStrategy(cleaned, scores);
  const { operation, garrison } = planOperation({
    ...cleaned,
    memory: withStrategy,
  });
  return {
    memory: { ...withStrategy, operation, garrison },
    scores,
    chosen,
  };
};

/**
 * Учитывает итог выполненного действия в памяти: новая задача или её
 * продолжение, закрытие стройки после успеха.
 *
 * @param memory - Память до действия.
 * @param candidate - Выполненное предложение.
 * @param ok - Успешна ли команда.
 * @param turn - Текущий круг.
 * @param review - Срок пересмотра задачи в кругах.
 */
export const applyOutcome = (
  memory: AiMemory,
  candidate: Candidate,
  ok: boolean,
  turn: number,
  review: number,
): AiMemory => {
  if (!ok) return memory;
  const unitId = candidate.actorId;
  if (candidate.action.type === 'build' && unitId) {
    return {
      ...memory,
      tasks: memory.tasks.filter(task => task.unitId !== unitId),
    };
  }
  if (!candidate.task) return memory;
  const existing = memory.tasks.find(
    task => task.unitId === candidate.task!.unitId,
  );
  if (
    existing &&
    existing.ruleId === candidate.task.ruleId &&
    existing.target.x === candidate.task.target.x &&
    existing.target.y === candidate.task.target.y
  ) {
    return memory;
  }
  const others = memory.tasks.filter(
    task => task.unitId !== candidate.task!.unitId,
  );
  return {
    ...memory,
    nextTaskId: memory.nextTaskId + 1,
    tasks: [
      ...others,
      {
        ...candidate.task,
        id: `t${memory.nextTaskId}`,
        createdTurn: turn,
        reviewTurn: turn + review,
      },
    ],
  };
};
