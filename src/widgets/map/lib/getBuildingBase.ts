export const getBuildingBase = (
  cellX: number,
  cellY: number,
  cellSize: number,
  scale: number = 1,
) => {
  const offset = (cellSize * (1 - scale)) / 2;
  const baseX = cellX * cellSize + offset;
  const baseY = cellY * cellSize + offset;
  const unit = cellSize * scale;

  return { baseX, baseY, unit };
};
