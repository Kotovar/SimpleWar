import type { Cell } from '@shared/config';

// Координатный шум: декор не меняет положение при перерисовке карты.
export const sample = (x: number, y: number, salt: number) => {
  let value = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ salt;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 0x100000000;
};

export const drawGroundDetails = (
  ctx: CanvasRenderingContext2D,
  grid: Cell[][],
  cellSize: number,
) => {
  ctx.save();
  ctx.scale(cellSize / 32, cellSize / 32);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 0.8;

  grid.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (cell.type !== 'grass' || sample(x, y, 17) > 0.62) return;
      const px = x * 32 + 7 + sample(x, y, 101) * 18;
      const py = y * 32 + 9 + sample(x, y, 307) * 16;
      const neighbors = [
        grid[y - 1]?.[x],
        grid[y + 1]?.[x],
        row[x - 1],
        row[x + 1],
      ];
      const nearForest = neighbors.some(
        neighbor => neighbor?.type === 'forest',
      );
      const nearRock = neighbors.some(
        neighbor => neighbor?.type === 'mountain',
      );
      const kind = sample(x, y, 991);

      ctx.save();
      ctx.translate(px, py);
      // Мелкие силуэты и приглушённые цвета отличают декор от ресурсов.
      if (nearForest && kind < 0.12) {
        ctx.fillStyle = '#786749';
        ctx.strokeStyle = '#4c6243';
        ctx.beginPath();
        ctx.roundRect(-2.5, -3, 5, 4, 1);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#b49c68';
        ctx.beginPath();
        ctx.ellipse(0, -3, 2.5, 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (nearForest && kind < 0.3) {
        ctx.strokeStyle = '#c4bd8c';
        ctx.beginPath();
        ctx.moveTo(-1, 0);
        ctx.lineTo(-1, -3);
        ctx.moveTo(3, 1);
        ctx.lineTo(3, -1);
        ctx.stroke();
        ctx.fillStyle = '#b28a62';
        ctx.beginPath();
        ctx.ellipse(-1, -3, 2.2, 1.5, 0, Math.PI, Math.PI * 2);
        ctx.closePath();
        ctx.moveTo(1.4, -1);
        ctx.ellipse(3, -1, 1.6, 1.2, 0, Math.PI, Math.PI * 2);
        ctx.fill();
      } else if (kind < (nearRock ? 0.45 : 0.09)) {
        ctx.fillStyle = '#8d9b79';
        ctx.strokeStyle = '#56784f';
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.lineTo(-2, -2);
        ctx.lineTo(0, -3);
        ctx.lineTo(2, -1);
        ctx.lineTo(2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillRect(4, 0, 1.5, 1);
      } else {
        // Цвет плавно меняется по карте, а не случайно от клетки к клетке.
        ctx.strokeStyle =
          Math.sin(x * 0.55) + Math.cos(y * 0.45) > 0.4 ? '#83ac55' : '#478b43';
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.lineTo(-5, -3);
        ctx.moveTo(-2, 0);
        ctx.lineTo(-2, -4);
        ctx.moveTo(-1, 0);
        ctx.lineTo(1, -2);
        ctx.moveTo(4, 3);
        ctx.lineTo(3, 1);
        ctx.moveTo(5, 3);
        ctx.lineTo(6, 0);
        ctx.stroke();
      }
      ctx.restore();
    }),
  );
  ctx.restore();
};
