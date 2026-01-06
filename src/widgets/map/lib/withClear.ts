export const withClear = (
  ctx: CanvasRenderingContext2D,
  render: () => void,
) => {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  render();
};
