import { FOG } from '@shared/config';
import { smoothNoise, type CellRange } from '@shared/lib';
import type { ParticipantKnowledge } from '@entities/perceptions';

/** Сторона плитки облаков, px; плитка покрывает 13 × 13 клеток. */
const CLOUD_TILE = 384;
const CLOUD_CELLS = 13;

let cloudTile: HTMLCanvasElement | null | undefined;

/**
 * Бесшовная плитка облаков неразведанного: непрозрачная основа цвета
 * тумана и мягкие светлые и тёмные пятна. Пятна у края повторяются со
 * сдвигом на плитку, поэтому стыков нет. Без Canvas (тесты) — `null`.
 */
const getCloudTile = () => {
  if (cloudTile !== undefined) return cloudTile;
  const canvas =
    typeof document === 'undefined' ? null : document.createElement('canvas');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return (cloudTile = null);
  canvas.width = canvas.height = CLOUD_TILE;
  ctx.fillStyle = FOG.unknown;
  ctx.fillRect(0, 0, CLOUD_TILE, CLOUD_TILE);
  // Детерминированный разброс: рисунок не меняется между запусками.
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 60; i++) {
    const x = random() * CLOUD_TILE;
    const y = random() * CLOUD_TILE;
    const r = 20 + random() ** 2 * 110;
    const light = i % 3 !== 0;
    const color = light ? '120 140 165' : '0 0 0';
    const alpha = light ? 0.03 + random() * 0.04 : 0.18;
    for (const dx of [-CLOUD_TILE, 0, CLOUD_TILE]) {
      for (const dy of [-CLOUD_TILE, 0, CLOUD_TILE]) {
        const gradient = ctx.createRadialGradient(
          x + dx,
          y + dy,
          0,
          x + dx,
          y + dy,
          r,
        );
        gradient.addColorStop(0, `rgb(${color} / ${alpha})`);
        gradient.addColorStop(1, `rgb(${color} / 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
      }
    }
  }
  return (cloudTile = canvas);
};

/** Заливка неразведанного: облака, привязанные к миру, иначе ровный цвет. */
const unknownFill = (ctx: CanvasRenderingContext2D, cellSize: number) => {
  const tile = getCloudTile();
  const pattern = tile && ctx.createPattern?.(tile, 'repeat');
  if (!pattern) return FOG.unknown;
  const scale = (CLOUD_CELLS * cellSize) / CLOUD_TILE;
  pattern.setTransform?.(new DOMMatrix().scale(scale, scale));
  return pattern;
};

/** Пикселей маски на клетку: поле гладкое, растяжение не даёт ступенек. */
const MASK_RES = 5;
/** Полуширина мягкого перехода, в долях покрытия. */
const EDGE = 0.2;
/**
 * Размах шума кромки. Меньше `0.5 − EDGE`: центр видимой клетки всегда
 * чист, центр закрытой — всегда закрыт.
 */
const WOBBLE = 0.25;

const smoothstep = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/**
 * Плотность тумана в точке мира: покрытие клеток, сглаженно
 * интерполированное между их центрами, с шумом кромки. Углы клеток
 * скругляются, прямые границы волнятся, шум привязан к миру.
 *
 * @param covered - Закрыта ли клетка туманом.
 * @param x - Координата точки в клетках.
 * @param y - Координата точки в клетках.
 * @param salt - Соль шума: у слоёв разная кромка.
 * @returns Непрозрачность тумана от 0 до 1.
 */
export const fogDensity = (
  covered: (x: number, y: number) => boolean,
  x: number,
  y: number,
  salt: number,
) => {
  const gx = Math.floor(x - 0.5);
  const gy = Math.floor(y - 0.5);
  const tx = smoothstep(x - 0.5 - gx);
  const ty = smoothstep(y - 0.5 - gy);
  const at = (cx: number, cy: number) => (covered(cx, cy) ? 1 : 0);
  const value =
    (at(gx, gy) * (1 - tx) + at(gx + 1, gy) * tx) * (1 - ty) +
    (at(gx, gy + 1) * (1 - tx) + at(gx + 1, gy + 1) * tx) * ty;
  const noise = (smoothNoise(x, y, 0.7, salt) - 0.5) * 2 * WOBBLE;
  return smoothstep((value + noise - 0.5 + EDGE) / (2 * EDGE));
};

const [EXPLORED_R, EXPLORED_G, EXPLORED_B, EXPLORED_A] = (
  FOG.explored.match(/[\d.]+/g) ?? []
).map(Number);

type Masks = { explored: HTMLCanvasElement; unknown: HTMLCanvasElement };
let masksKey = '';
let masksKnowledge: ParticipantKnowledge | null = null;
let masks: Masks | null = null;
let layer: HTMLCanvasElement | null = null;

/**
 * Маски слоёв в низком разрешении: разведанное — уже в цвете затемнения,
 * неизвестное — альфа под облака. Кэш по знаниям и диапазону: панорама
 * внутри клетки не пересчитывает поле.
 */
const getMasks = (
  knowledge: ParticipantKnowledge,
  covered: (x: number, y: number, unknown: boolean) => boolean,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) => {
  const key = `${x0},${y0},${x1},${y1}`;
  if (masks && masksKnowledge === knowledge && masksKey === key) return masks;
  masks ??= {
    explored: document.createElement('canvas'),
    unknown: document.createElement('canvas'),
  };
  const width = (x1 - x0) * MASK_RES;
  const height = (y1 - y0) * MASK_RES;
  const explored = new ImageData(width, height);
  const unknown = new ImageData(width, height);
  const isExplored = (x: number, y: number) => covered(x, y, false);
  const isUnknown = (x: number, y: number) => covered(x, y, true);
  for (let j = 0; j < height; j++) {
    const y = y0 + (j + 0.5) / MASK_RES;
    for (let i = 0; i < width; i++) {
      const x = x0 + (i + 0.5) / MASK_RES;
      const p = (j * width + i) * 4;
      explored.data[p] = EXPLORED_R;
      explored.data[p + 1] = EXPLORED_G;
      explored.data[p + 2] = EXPLORED_B;
      explored.data[p + 3] =
        255 * EXPLORED_A * fogDensity(isExplored, x, y, 11);
      unknown.data[p + 3] = 255 * fogDensity(isUnknown, x, y, 23);
    }
  }
  for (const [canvas, data] of [
    [masks.explored, explored],
    [masks.unknown, unknown],
  ] as const) {
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')?.putImageData(data, 0, 0);
  }
  masksKnowledge = knowledge;
  masksKey = key;
  return masks;
};

/**
 * Рисует туман в диапазоне клеток: видимые прозрачны, разведанные
 * затемнены, неизвестные закрыты сплошь облаками. Границы — изолинии
 * гладкого поля покрытия ({@link fogDensity}): без углов клеток, с мягкой
 * волнистой кромкой; механика видимости не меняется.
 * Запас клеток сохраняет переходы у края окна; у края карты повторяется
 * состояние крайней клетки, чтобы сплошной туман не становился прозрачным.
 *
 * @param ctx - Контекст холста тумана с трансформацией камеры.
 * @param knowledge - Знания смотрящего участника.
 * @param cellSize - Размер клетки в CSS-пикселях.
 * @param range - Клетки в окне камеры.
 */
export const renderFogLayer = (
  ctx: CanvasRenderingContext2D,
  knowledge: ParticipantKnowledge,
  cellSize: number,
  range: CellRange,
) => {
  const { width, height, visible, terrain } = knowledge;
  if (!width || !height || range.x0 >= range.x1 || range.y0 >= range.y1) return;
  // Без DOM (тесты) и до раскладки холста рисовать некуда.
  const { canvas } = ctx;
  if (typeof document === 'undefined' || !canvas.width || !canvas.height) {
    return;
  }

  const x0 = Math.max(-1, range.x0 - 1);
  const x1 = Math.min(width + 1, range.x1 + 1);
  const y0 = Math.max(-1, range.y0 - 1);
  const y1 = Math.min(height + 1, range.y1 + 1);
  const covered = (x: number, y: number, unknown: boolean) => {
    const index =
      Math.min(height - 1, Math.max(0, y)) * width +
      Math.min(width - 1, Math.max(0, x));
    return !visible[index] && (!unknown || !terrain[index]);
  };
  const { explored, unknown } = getMasks(knowledge, covered, x0, y0, x1, y1);

  // Облака маскируются на отдельном слое: холст под туманом не трогаем.
  layer ??= document.createElement('canvas');
  layer.width = ctx.canvas.width;
  layer.height = ctx.canvas.height;
  const layerCtx = layer.getContext('2d');
  if (!layerCtx) return;
  layerCtx.setTransform(ctx.getTransform());
  layerCtx.imageSmoothingEnabled = true;
  layerCtx.imageSmoothingQuality = 'high';
  const left = x0 * cellSize;
  const top = y0 * cellSize;
  const w = (x1 - x0) * cellSize;
  const h = (y1 - y0) * cellSize;
  layerCtx.drawImage(unknown, left, top, w, h);
  layerCtx.globalCompositeOperation = 'source-in';
  layerCtx.fillStyle = unknownFill(layerCtx, cellSize);
  layerCtx.fillRect(left, top, w, h);
  // Затемнение разведанного — под облаками: на кромке они смешиваются.
  layerCtx.globalCompositeOperation = 'destination-over';
  layerCtx.drawImage(explored, left, top, w, h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width * cellSize, height * cellSize);
  ctx.clip();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
};
