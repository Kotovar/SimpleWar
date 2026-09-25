const PERIOD = 1400;
// 30 кадров в секунду хватает для мягкого «дыхания»; чаще — лишняя
// перерисовка полного слоя.
const FRAME_INTERVAL = 1000 / 30;

// Фаза зависит только от времени: перезапуск цикла при наведении курсора
// продолжает пульс с того же места, без рывка.
const phaseAt = (time: number) =>
  (1 - Math.cos(((time % PERIOD) / PERIOD) * Math.PI * 2)) / 2;

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * Перерисовывает слой с фазой пульсации от 0 до 1, пока `active`.
 *
 * Без активного выделения или при `prefers-reduced-motion` слой рисуется
 * один раз в покое. Возвращает функцию остановки цикла для `useEffect`.
 */
export const animatePulse = (
  active: boolean,
  draw: (pulse: number) => void,
) => {
  if (!active || prefersReducedMotion()) {
    draw(0);
    return;
  }

  draw(phaseAt(performance.now()));

  let frame = 0;
  let last = 0;
  const tick = (time: number) => {
    frame = requestAnimationFrame(tick);
    if (time - last < FRAME_INTERVAL) return;
    last = time;
    draw(phaseAt(time));
  };
  frame = requestAnimationFrame(tick);

  return () => cancelAnimationFrame(frame);
};
