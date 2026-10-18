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

/**
 * Клетки, у которых изменилось покрытие туманом: рамка `[x0, x1) × [y0, y1)`
 * либо `null`, если покрытие то же. Значения сравниваются как флаги:
 * счётчик обзора, ставший 2 вместо 1, туман не меняет.
 */
export const changedCells = (
  width: number,
  prev: { visible: Uint8Array; terrain: Uint8Array },
  next: { visible: Uint8Array; terrain: Uint8Array },
) => {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < next.visible.length; i++) {
    if (
      !prev.visible[i] === !next.visible[i] &&
      !prev.terrain[i] === !next.terrain[i]
    )
      continue;
    const x = i % width;
    const y = (i - x) / width;
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x + 1);
    y1 = Math.max(y1, y + 1);
  }
  return x0 === Infinity ? null : { x0, y0, x1, y1 };
};

type Masks = {
  explored: HTMLCanvasElement;
  unknown: HTMLCanvasElement;
  exploredData: ImageData;
  unknownData: ImageData;
};
let masksKey = '';
let masksVisible: Uint8Array | null = null;
let masksTerrain: Uint8Array | null = null;
// Копии: `observe` может заменить массивы, и сравнивать надо с нарисованным.
let drawnVisible: Uint8Array | null = null;
let drawnTerrain: Uint8Array | null = null;
let masks: Masks | null = null;
let layer: HTMLCanvasElement | null = null;

/**
 * Маски слоёв в низком разрешении на всю карту с запасом в клетку:
 * разведанное — уже в цвете затемнения, неизвестное — альфа под облака.
 * Панорама и масштаб поле не пересчитывают; изменение обзора пересчитывает
 * только изменившиеся клетки с соседями — плотность точки зависит от
 * клеток в пределах одной. Несколько очагов сливаются в общую рамку.
 */
const getMasks = (
  knowledge: ParticipantKnowledge,
  covered: (x: number, y: number, unknown: boolean) => boolean,
) => {
  const { width: columns, height: rows, visible, terrain } = knowledge;
  if (masks && masksVisible === visible && masksTerrain === terrain) {
    return masks;
  }
  const key = `${columns},${rows}`;
  const width = (columns + 2) * MASK_RES;
  const height = (rows + 2) * MASK_RES;
  // Клетки маски от −1 до размера карты включительно.
  let cells = { x0: -1, y0: -1, x1: columns + 1, y1: rows + 1 };
  if (masks && masksKey === key && drawnVisible && drawnTerrain) {
    const dirty = changedCells(
      columns,
      { visible: drawnVisible, terrain: drawnTerrain },
      { visible, terrain },
    );
    if (dirty) {
      cells = {
        x0: Math.max(-1, dirty.x0 - 1),
        y0: Math.max(-1, dirty.y0 - 1),
        x1: Math.min(columns + 1, dirty.x1 + 1),
        y1: Math.min(rows + 1, dirty.y1 + 1),
      };
    } else {
      cells = { x0: 0, y0: 0, x1: 0, y1: 0 };
    }
  } else {
    const explored = document.createElement('canvas');
    const unknown = document.createElement('canvas');
    explored.width = unknown.width = width;
    explored.height = unknown.height = height;
    masks = {
      explored,
      unknown,
      exploredData: new ImageData(width, height),
      unknownData: new ImageData(width, height),
    };
  }
  const { exploredData, unknownData } = masks;
  const isExplored = (x: number, y: number) => covered(x, y, false);
  const isUnknown = (x: number, y: number) => covered(x, y, true);
  const i0 = (cells.x0 + 1) * MASK_RES;
  const i1 = (cells.x1 + 1) * MASK_RES;
  const j0 = (cells.y0 + 1) * MASK_RES;
  const j1 = (cells.y1 + 1) * MASK_RES;
  for (let j = j0; j < j1; j++) {
    const y = -1 + (j + 0.5) / MASK_RES;
    for (let i = i0; i < i1; i++) {
      const x = -1 + (i + 0.5) / MASK_RES;
      const p = (j * width + i) * 4;
      exploredData.data[p] = EXPLORED_R;
      exploredData.data[p + 1] = EXPLORED_G;
      exploredData.data[p + 2] = EXPLORED_B;
      exploredData.data[p + 3] =
        255 * EXPLORED_A * fogDensity(isExplored, x, y, 11);
      unknownData.data[p + 3] = 255 * fogDensity(isUnknown, x, y, 23);
    }
  }
  if (i1 > i0 && j1 > j0) {
    for (const [canvas, data] of [
      [masks.explored, exploredData],
      [masks.unknown, unknownData],
    ] as const) {
      canvas
        .getContext('2d')
        ?.putImageData(data, 0, 0, i0, j0, i1 - i0, j1 - j0);
    }
  }
  masksVisible = visible;
  masksTerrain = terrain;
  drawnVisible = visible.slice();
  drawnTerrain = terrain.slice();
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
 * @param quality - Сглаживание растяжения маски из настроек графики.
 */
export const renderFogLayer = (
  ctx: CanvasRenderingContext2D,
  knowledge: ParticipantKnowledge,
  cellSize: number,
  range: CellRange,
  quality: ImageSmoothingQuality = 'high',
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
  const { explored, unknown } = getMasks(knowledge, covered);

  // Облака маскируются на отдельном слое: холст под туманом не трогаем.
  // Слой — в CSS-пикселях: размытому туману плотность экрана не нужна, а
  // сглаживание «высокое» на DPR 2 вчетверо дороже. Размер меняется только
  // вслед за холстом: присваивание сбрасывает буфер.
  const k = Math.min(1, 1 / (globalThis.devicePixelRatio || 1));
  const lw = Math.ceil(canvas.width * k);
  const lh = Math.ceil(canvas.height * k);
  layer ??= document.createElement('canvas');
  if (layer.width !== lw || layer.height !== lh) {
    layer.width = lw;
    layer.height = lh;
  }
  const layerCtx = layer.getContext('2d');
  if (!layerCtx) return;
  // Очистка и перенос — только карта в окне, в пикселях слоя.
  const m = ctx.getTransform();
  const lx0 = Math.max(0, Math.floor(m.e * k));
  const ly0 = Math.max(0, Math.floor(m.f * k));
  const lx1 = Math.min(lw, Math.ceil((m.a * width * cellSize + m.e) * k));
  const ly1 = Math.min(lh, Math.ceil((m.d * height * cellSize + m.f) * k));
  if (lx0 >= lx1 || ly0 >= ly1) return;
  layerCtx.setTransform(1, 0, 0, 1, 0, 0);
  layerCtx.globalCompositeOperation = 'source-over';
  // Запас в 2 пикселя: растяжение слоя при копии подмешивает соседние
  // пиксели, и за краем карты не должен оставаться туман прошлого кадра.
  layerCtx.clearRect(lx0 - 2, ly0 - 2, lx1 - lx0 + 4, ly1 - ly0 + 4);
  layerCtx.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]).multiply(m));
  layerCtx.imageSmoothingEnabled = true;
  // 'low' дешевле вдвое, но при сильном растяжении маски кромка грубеет.
  layerCtx.imageSmoothingQuality = quality;
  const left = x0 * cellSize;
  const top = y0 * cellSize;
  const w = (x1 - x0) * cellSize;
  const h = (y1 - y0) * cellSize;
  // Фрагмент маски окна: маска начинается с клетки −1.
  const sx = (x0 + 1) * MASK_RES;
  const sy = (y0 + 1) * MASK_RES;
  const sw = (x1 - x0) * MASK_RES;
  const sh = (y1 - y0) * MASK_RES;
  layerCtx.drawImage(unknown, sx, sy, sw, sh, left, top, w, h);
  layerCtx.globalCompositeOperation = 'source-in';
  layerCtx.fillStyle = unknownFill(layerCtx, cellSize);
  layerCtx.fillRect(left, top, w, h);
  // Затемнение разведанного — под облаками: на кромке они смешиваются.
  layerCtx.globalCompositeOperation = 'destination-over';
  layerCtx.drawImage(explored, sx, sy, sw, sh, left, top, w, h);

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const [lw0, lh0] = [lx1 - lx0, ly1 - ly0];
  ctx.drawImage(layer, lx0, ly0, lw0, lh0, lx0 / k, ly0 / k, lw0 / k, lh0 / k);
  ctx.restore();
};
