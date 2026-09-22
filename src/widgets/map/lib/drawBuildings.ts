import { TEAM_MARKERS, type Owner } from '@shared/config';
import { banner, beginEntity, rect, shape } from './drawEntity';

export const drawBase = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  rect(ctx, '#b6c2c5', 7, 13, 18, 12);
  // Две широкие зубчатые башни отличают базу от одиночной башни.
  shape(
    ctx,
    '#dce1d5',
    [4, 25, 4, 7, 7, 7, 7, 10, 10, 10, 10, 7, 13, 7, 13, 25],
  );
  shape(
    ctx,
    '#dce1d5',
    [19, 25, 19, 7, 22, 7, 22, 10, 25, 10, 25, 7, 28, 7, 28, 25],
  );
  shape(ctx, '#313b42', [13, 25, 13, 19, 16, 16, 19, 19, 19, 25]);
  ctx.fillStyle = '#536775';
  ctx.fillRect(7, 14, 3, 5);
  ctx.fillRect(22, 14, 3, 5);
  banner(ctx, 16, 4, TEAM_MARKERS[owner].color, 12);
  ctx.restore();
};

export const drawGoldMine = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  shape(ctx, '#89918e', [3, 25, 6, 13, 12, 7, 21, 8, 27, 15, 29, 25]);
  shape(ctx, '#b9bfac', [6, 13, 12, 7, 21, 8, 17, 14]);
  rect(ctx, '#252e33', 10, 15, 12, 10);
  rect(ctx, '#b98a51', 8, 14, 3, 11);
  rect(ctx, '#b98a51', 21, 14, 3, 11);
  rect(ctx, TEAM_MARKERS[owner].color, 8, 12, 16, 3);
  shape(ctx, '#f5cd53', [14, 24, 16, 19, 20, 19, 23, 24]);
  ctx.restore();
};

export const drawSawmill = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  rect(ctx, '#b88b58', 6, 13, 19, 11);
  shape(ctx, TEAM_MARKERS[owner].color, [3, 14, 10, 7, 22, 7, 28, 14]);
  rect(ctx, '#303a36', 10, 16, 7, 8);
  // Светлые торцы брёвен — крупный опознавательный признак лесопилки.
  rect(ctx, '#805938', 17, 19, 10, 6);
  rect(ctx, '#e8bf80', 20, 17, 6, 4);
  rect(ctx, '#e8bf80', 16, 21, 6, 4);
  rect(ctx, '#e8bf80', 23, 21, 6, 4);
  ctx.restore();
};

export const drawFarm = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  rect(ctx, '#e1c996', 5, 13, 13, 12);
  shape(ctx, '#d6aa47', [3, 14, 11, 6, 20, 14]);
  rect(ctx, '#68503e', 9, 18, 5, 7);
  rect(ctx, '#725637', 20, 15, 8, 10);
  ctx.strokeStyle = '#f7d776';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(22, 17);
  ctx.lineTo(22, 23);
  ctx.moveTo(26, 17);
  ctx.lineTo(26, 23);
  ctx.stroke();
  banner(ctx, 24, 7, TEAM_MARKERS[owner].color, 8);
  ctx.restore();
};

export const drawBarracks = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  rect(ctx, '#bbb6a3', 5, 14, 22, 11);
  shape(ctx, '#98634c', [3, 14, 8, 8, 24, 8, 29, 14]);
  rect(ctx, '#41434a', 12, 18, 8, 7);
  // Большой щит над входом вместо мелких флагов.
  shape(
    ctx,
    TEAM_MARKERS[owner].color,
    [12, 10, 20, 10, 20, 14, 16, 18, 12, 14],
  );
  ctx.fillStyle = '#736c59';
  ctx.fillRect(15, 11, 2, 4);
  ctx.restore();
};

export const drawTower = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  shape(ctx, '#aebbbd', [8, 25, 11, 12, 21, 12, 24, 25]);
  shape(
    ctx,
    '#dce1d5',
    [
      9, 12, 8, 5, 12, 5, 12, 8, 14, 8, 14, 5, 18, 5, 18, 8, 20, 8, 20, 5, 24,
      5, 23, 12,
    ],
  );
  rect(ctx, '#384650', 14, 15, 4, 6);
  rect(ctx, TEAM_MARKERS[owner].color, 8, 23, 16, 2);
  ctx.restore();
};
