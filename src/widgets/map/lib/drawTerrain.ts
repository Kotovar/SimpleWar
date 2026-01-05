const FOREST_TREE_SHADOW = 'rgba(0,0,0,0.25)';
const FOREST_TREE_TRUNK = '#5a3e1b';
const FOREST_TREE_CROWN = '#2f7d46';

const ORE_SHADOW = 'rgba(0,0,0,0.25)';
const ORE_GOLD_DARK = '#c9a227';
const ORE_GOLD_LIGHT = '#f5d76e';

const MOUNTAIN_SHADOW = 'rgba(0,0,0,0.25)';
const MOUNTAIN_DARK = '#6e6e6e';
const MOUNTAIN_LIGHT = '#9a9a9a';
const MOUNTAIN_SNOW = '#eaeaea';

const WATER_COLOR = '#3399ff';

const SELECTED_TERRAIN = '#6766b090';

const GRID_LINE_THICKNESS = 1;

export const drawForest = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
) => {
  const baseX = cellX * cellSize;
  const baseY = cellY * cellSize;

  const drawTree = (x: number, y: number) => {
    // тень
    ctx.fillStyle = FOREST_TREE_SHADOW;
    ctx.fillRect(
      x + 0.06 * cellSize,
      y + 0.63 * cellSize,
      0.23 * cellSize,
      0.06 * cellSize,
    );

    // ствол
    ctx.fillStyle = FOREST_TREE_TRUNK;
    ctx.fillRect(
      x + 0.14 * cellSize,
      y + 0.34 * cellSize,
      0.04 * cellSize,
      0.28 * cellSize,
    );

    // крона
    ctx.fillStyle = FOREST_TREE_CROWN;
    ctx.fillRect(
      x + 0.03 * cellSize,
      y + 0.17 * cellSize,
      0.28 * cellSize,
      0.17 * cellSize,
    );
    ctx.fillRect(
      x + 0.08 * cellSize,
      y + 0.08 * cellSize,
      0.17 * cellSize,
      0.14 * cellSize,
    );
    ctx.fillRect(x + 0.11 * cellSize, y, 0.11 * cellSize, 0.11 * cellSize);
  };

  // деревья внутри клетки
  drawTree(baseX + 0.17 * cellSize, baseY + 0.22 * cellSize);
  drawTree(baseX + 0.51 * cellSize, baseY + 0.28 * cellSize);
};

export const drawGoldOre = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
) => {
  const baseX = cellX * cellSize;
  const baseY = cellY * cellSize;

  // тень
  ctx.fillStyle = ORE_SHADOW;
  ctx.fillRect(
    baseX + 0.32 * cellSize,
    baseY + 0.68 * cellSize,
    0.36 * cellSize,
    0.07 * cellSize,
  );

  // основной камень
  ctx.fillStyle = ORE_GOLD_DARK;
  ctx.fillRect(
    baseX + 0.34 * cellSize,
    baseY + 0.48 * cellSize,
    0.32 * cellSize,
    0.22 * cellSize,
  );

  // второй камень
  ctx.fillRect(
    baseX + 0.26 * cellSize,
    baseY + 0.54 * cellSize,
    0.24 * cellSize,
    0.18 * cellSize,
  );

  // блик
  ctx.fillStyle = ORE_GOLD_LIGHT;
  ctx.fillRect(
    baseX + 0.42 * cellSize,
    baseY + 0.52 * cellSize,
    0.08 * cellSize,
    0.06 * cellSize,
  );
};

export const drawMountains = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
) => {
  const baseX = cellX * cellSize;
  const baseY = cellY * cellSize;

  // тень
  ctx.fillStyle = MOUNTAIN_SHADOW;
  ctx.fillRect(
    baseX + 0.18 * cellSize,
    baseY + 0.7 * cellSize,
    0.64 * cellSize,
    0.08 * cellSize,
  );

  const drawPeak = (x: number, width: number, height: number) => {
    // тёмная грань
    ctx.fillStyle = MOUNTAIN_DARK;
    ctx.beginPath();
    ctx.moveTo(x, baseY + 0.7 * cellSize);
    ctx.lineTo(x + width / 2, baseY + 0.7 * cellSize - height);
    ctx.lineTo(x + width, baseY + 0.7 * cellSize);
    ctx.closePath();
    ctx.fill();

    // светлая грань
    ctx.fillStyle = MOUNTAIN_LIGHT;
    ctx.beginPath();
    ctx.moveTo(x + width * 0.15, baseY + 0.7 * cellSize);
    ctx.lineTo(x + width / 2, baseY + 0.7 * cellSize - height * 0.85);
    ctx.lineTo(x + width * 0.85, baseY + 0.7 * cellSize);
    ctx.closePath();
    ctx.fill();

    // снег на вершине
    ctx.fillStyle = MOUNTAIN_SNOW;
    ctx.beginPath();
    ctx.moveTo(x + width * 0.4, baseY + 0.7 * cellSize - height * 0.35);
    ctx.lineTo(x + width / 2, baseY + 0.7 * cellSize - height * 0.55);
    ctx.lineTo(x + width * 0.6, baseY + 0.7 * cellSize - height * 0.35);
    ctx.closePath();
    ctx.fill();
  };

  // пики
  drawPeak(baseX + 0.12 * cellSize, 0.28 * cellSize, 0.32 * cellSize);
  drawPeak(baseX + 0.36 * cellSize, 0.34 * cellSize, 0.4 * cellSize);
  drawPeak(baseX + 0.62 * cellSize, 0.24 * cellSize, 0.28 * cellSize);
};

export const drawWater = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
) => {
  ctx.fillStyle = WATER_COLOR;
  const baseX = cellX * cellSize;
  const baseY = cellY * cellSize;

  ctx.fillRect(
    baseX + GRID_LINE_THICKNESS,
    baseY + GRID_LINE_THICKNESS,
    cellSize - GRID_LINE_THICKNESS * 2,
    cellSize - GRID_LINE_THICKNESS * 2,
  );
};

export const drawTerrainHighlight = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
) => {
  const baseX = cellX * cellSize;
  const baseY = cellY * cellSize;

  ctx.strokeStyle = SELECTED_TERRAIN;
  ctx.lineWidth = GRID_LINE_THICKNESS * 2;
  ctx.beginPath();
  ctx.strokeRect(
    baseX + GRID_LINE_THICKNESS * 3,
    baseY + GRID_LINE_THICKNESS * 3,
    cellSize - GRID_LINE_THICKNESS * 6,
    cellSize - GRID_LINE_THICKNESS * 6,
  );
  ctx.stroke();
};
