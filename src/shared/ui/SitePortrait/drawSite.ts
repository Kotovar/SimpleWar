import type { SiteType } from '@shared/config';
import {
  OPENING,
  STONE,
  STONE_DARK,
  STONE_LIGHT,
  TIMBER,
  circle,
  rect,
  shape,
} from '../EntityPortrait/drawEntity';

const GOLD = '#f0c35a';
const IRON = '#4a4e52';

const line = (
  ctx: CanvasRenderingContext2D,
  color: string,
  width: number,
  points: readonly number[],
) => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) {
    ctx.lineTo(points[i], points[i + 1]);
  }
  ctx.stroke();
  ctx.restore();
};

/** Нейтральный значок находки, общий для карты и карточки. */
export const drawSite = (
  ctx: CanvasRenderingContext2D,
  type: SiteType,
  x: number,
  y: number,
  cellSize: number,
) => {
  ctx.save();
  ctx.translate(x * cellSize, y * cellSize);
  ctx.scale(cellSize / 32, cellSize / 32);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = '#292c30';
  // Тень без постамента: у находки нет владельца.
  ctx.fillStyle = 'rgba(16, 26, 22, 0.35)';
  ctx.beginPath();
  ctx.ellipse(16.5, 26.5, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  switch (type) {
    case 'cache': {
      // Сундук на разрытой земле, рядом воткнута лопата.
      shape(ctx, '#7a5a3a', [3, 26, 6, 22.5, 12, 21, 22, 21, 27, 23, 29, 26]);
      rect(ctx, '#8a5a32', 6, 16, 18, 9);
      shape(ctx, '#a8713f', [6, 16, 7, 12, 10, 10, 20, 10, 23, 12, 24, 16]);
      rect(ctx, IRON, 9, 10.5, 2.5, 14.5);
      rect(ctx, IRON, 18.5, 10.5, 2.5, 14.5);
      rect(ctx, GOLD, 13.5, 14.5, 3, 4);
      ctx.lineWidth = 0.8;
      circle(ctx, GOLD, 4.5, 25, 1.4);
      circle(ctx, GOLD, 25.5, 25.5, 1.3);
      ctx.lineWidth = 1.2;
      line(ctx, TIMBER, 1.6, [27.5, 5, 27.5, 18]);
      line(ctx, TIMBER, 1.6, [25.8, 5, 29.2, 5]);
      shape(
        ctx,
        STONE_DARK,
        [26, 17.5, 29, 17.5, 29, 21.5, 27.5, 23.5, 26, 21.5],
      );
      break;
    }
    case 'refugees': {
      // Путник в капюшоне тянет тележку со скарбом.
      shape(ctx, TIMBER, [2.5, 18.5, 15, 18.5, 14, 22, 3.5, 22]);
      circle(ctx, '#d7c6a1', 6, 16.5, 2.8);
      circle(ctx, '#b8a17a', 11, 16, 3.2);
      circle(ctx, '#a87945', 7.5, 23.5, 3.2);
      circle(ctx, '#5b4630', 7.5, 23.5, 0.9);
      line(ctx, TIMBER, 1.4, [14.5, 20, 18.5, 18]);
      shape(ctx, '#8c7a5c', [16.5, 26, 19, 14, 25, 13.5, 27.5, 26]);
      circle(ctx, '#c1966d', 18, 16, 2.8);
      shape(ctx, '#6f6148', [18.5, 14.5, 19.3, 9, 22, 6, 25, 8.5, 25.8, 14]);
      circle(ctx, '#e9c8a0', 23.3, 11, 1.7);
      line(ctx, TIMBER, 1.5, [27.5, 6.5, 28.5, 26.5]);
      break;
    }
    case 'obelisk': {
      // Древний камень со светящимися рунами.
      const glow = ctx.createRadialGradient(16, 11, 0, 16, 11, 10);
      glow.addColorStop(0, 'rgba(150, 245, 225, 0.55)');
      glow.addColorStop(1, 'rgba(150, 245, 225, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(6, 1, 20, 20);
      rect(ctx, '#7d847d', 6, 23, 20, 3.5);
      rect(ctx, '#9aa39b', 9, 20.5, 14, 2.5);
      shape(ctx, '#bfc9c1', [11, 20.5, 12.5, 6, 16, 2, 19.5, 6, 21, 20.5]);
      shape(ctx, '#8d9b95', [16, 2, 19.5, 6, 21, 20.5, 16.5, 20.5]);
      shape(ctx, '#a6e6da', [15.5, 7.5, 17.8, 10.5, 15.5, 13.5, 13.2, 10.5]);
      line(ctx, '#4fbfa9', 1, [13.8, 15.5, 14.6, 18]);
      line(ctx, '#4fbfa9', 1, [16.5, 15.5, 17.6, 16.6, 16.5, 18]);
      break;
    }
    case 'ruins': {
      // Обломок стены с окном, сломанная колонна и щебень.
      shape(
        ctx,
        '#8e8f80',
        [3, 26, 5, 23, 10, 22.5, 15, 24, 20, 23, 25, 23.5, 29, 26],
      );
      shape(
        ctx,
        STONE,
        [
          4, 25, 4, 10, 6, 7, 8, 9.5, 10, 8, 12, 12, 15, 11, 17, 15, 19, 14, 20,
          25,
        ],
      );
      shape(ctx, OPENING, [7, 19, 7, 15, 9, 13, 11, 15, 11, 19]);
      line(ctx, STONE_DARK, 1, [14, 17, 15.5, 19.5, 14.5, 22]);
      shape(ctx, STONE_DARK, [23, 25, 23, 13, 25, 11.5, 27, 14, 27, 25]);
      shape(ctx, STONE_LIGHT, [14, 22, 24, 21, 24.5, 24.2, 14.5, 25.2]);
      circle(ctx, STONE_DARK, 12.5, 25, 1.5);
      circle(ctx, STONE_LIGHT, 27.8, 25.6, 1.3);
      break;
    }
    case 'camp': {
      // Шатры, знамя, щит у входа и костёр.
      shape(ctx, '#a88a62', [14, 24, 20, 13, 26, 24]);
      shape(ctx, '#c3a477', [2, 25, 11, 9, 20, 25]);
      shape(ctx, '#4b3a2a', [8.5, 25, 11, 16.5, 13.5, 25]);
      line(ctx, TIMBER, 1.3, [11, 9, 11, 6]);
      line(ctx, TIMBER, 1.4, [26.5, 3.5, 26.5, 26]);
      shape(
        ctx,
        '#e5b661',
        [26.5, 3.5, 30.5, 4.5, 28.8, 7.3, 30.5, 10, 26.5, 11],
      );
      circle(ctx, '#8a5a32', 5.5, 22.2, 2.7);
      circle(ctx, STONE, 5.5, 22.2, 0.9);
      line(ctx, '#5b4630', 1.6, [16.5, 27, 23.5, 24.5]);
      line(ctx, '#5b4630', 1.6, [16.5, 24.5, 23.5, 27]);
      ctx.lineWidth = 0.7;
      shape(
        ctx,
        '#f0a040',
        [
          17.3, 25.8, 18, 21.5, 19.4, 22.8, 20.2, 18.5, 21.3, 22.6, 22.6, 21,
          23, 25.8,
        ],
      );
      shape(ctx, '#f8d78a', [19, 25.6, 20.1, 22.2, 21.2, 25.6]);
      break;
    }
  }
  ctx.restore();
};
