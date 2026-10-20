import { useEffect, useMemo, useState } from 'react';
import type { Owner, Position } from '@shared/config';
import { gameEvents } from '@shared/lib';
import type { Scene } from '@widgets/map/lib';

/** Сколько клетка гибели своего юнита остаётся открытой: хватает на анимацию. */
const REVEAL_MS = 2000;

/**
 * Следит за гибелью юнитов участника: клетка гибели попадает в список на
 * {@link REVEAL_MS}. Сброс партии очищает список; отписка отменяет таймеры.
 *
 * @param humanId - Участник за экраном.
 * @param onChange - Новый список открытых клеток.
 * @returns Отписка.
 */
export const watchDeathReveals = (
  humanId: Owner | null,
  onChange: (cells: Position[]) => void,
) => {
  let cells: Position[] = [];
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const update = (next: Position[]) => {
    cells = next;
    onChange(cells);
  };
  const clear = () => {
    timers.forEach(clearTimeout);
    timers.clear();
  };
  const unsubscribe = gameEvents.subscribe(event => {
    if (event.type === 'GAME_RESET') {
      clear();
      update([]);
    }
    if (event.type !== 'UNIT_DESTROYED' || event.owner !== humanId) return;
    const cell = { x: event.unit.x, y: event.unit.y };
    update([...cells, cell]);
    const timer = setTimeout(() => {
      timers.delete(timer);
      update(cells.filter(item => item !== cell));
    }, REVEAL_MS);
    timers.add(timer);
  });
  return () => {
    unsubscribe();
    clear();
  };
};

/**
 * Туман для рисования: клетка, где погиб свой юнит, открыта на время
 * анимации гибели — иначе последний свой юнит в округе исчезал бы под
 * туманом сразу. Знания не меняются: чужие объекты там не показываются.
 * Раскрытия принадлежат смотрящему: при смене участника они сбрасываются.
 *
 * @param fog - Туман сцены.
 * @param humanId - Участник за экраном.
 */
export const useDeathReveal = (fog: Scene['fog'], humanId: Owner | null) => {
  const [reveal, setReveal] = useState<{
    owner: Owner | null;
    cells: Position[];
  }>({ owner: humanId, cells: [] });

  useEffect(
    () =>
      watchDeathReveals(humanId, cells => setReveal({ owner: humanId, cells })),
    [humanId],
  );

  return useMemo(() => {
    // Список прежнего участника не показывается и до очистки эффектом.
    if (!fog || reveal.owner !== humanId || !reveal.cells.length) return fog;
    const visible = fog.visible.slice();
    for (const { x, y } of reveal.cells) visible[y * fog.width + x] = 1;
    return { ...fog, visible };
  }, [fog, humanId, reveal]);
};
