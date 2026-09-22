export const withClear = (
  ctx: CanvasRenderingContext2D,
  render: () => void,
) => {
  // Буфер слоя крупнее логического размера на HiDPI, поэтому чистим без масштаба.
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
  render();
};
