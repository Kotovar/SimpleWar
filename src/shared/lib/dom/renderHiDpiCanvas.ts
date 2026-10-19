/** Рисует в логическом размере и повторяет отрисовку при изменении окна. */
export const renderHiDpiCanvas = (
  canvas: HTMLCanvasElement,
  size: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const render = () => {
    const ratio = window.devicePixelRatio || 1;
    // Изменение размера буфера сбрасывает масштаб Canvas перед новой отрисовкой.
    canvas.width = Math.round(size * ratio);
    canvas.height = Math.round(size * ratio);
    ctx.scale(canvas.width / size, canvas.height / size);
    draw(ctx);
  };

  render();
  window.addEventListener('resize', render);
  return () => window.removeEventListener('resize', render);
};
