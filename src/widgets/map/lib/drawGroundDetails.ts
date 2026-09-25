import type { Cell } from '@shared/config';
import { sample, smoothNoise } from '@shared/lib';

export const drawGroundDetails = (
  ctx: CanvasRenderingContext2D,
  grid: Cell[][],
  cellSize: number,
  /** Под зданиями мелкий декор не рисуется: он торчал бы из-под модели. */
  builtCells: ReadonlySet<string> = new Set(),
) => {
  ctx.save();
  ctx.scale(cellSize / 32, cellSize / 32);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 0.8;

  grid.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (cell.type !== 'grass' || sample(x, y, 17) > 0.62) return;
      if (builtCells.has(`${x},${y}`)) return;
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
      } else if (kind > 0.86) {
        // Цветы: оттенок общий для луга, чтобы поляны читались пятнами.
        const petals = ['#f4efd8', '#f2d470', '#e9a7b8'][
          Math.floor(smoothNoise(x, y, 4, 577) * 3)
        ];
        ctx.fillStyle = petals;
        for (const [dx, dy] of [
          [-3, -1],
          [0, -3],
          [2.5, 0],
        ]) {
          ctx.beginPath();
          ctx.arc(dx, dy, 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#6c8a3a';
        ctx.fillRect(-0.5, 0, 1, 2);
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
