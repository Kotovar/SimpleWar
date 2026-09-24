import { createNoise2D } from 'simplex-noise';
import type { Cell, CellType } from '@shared/config';

/** Функция высоты: координаты клетки → значение примерно от -1 до 1. */
type HeightField = (x: number, y: number) => number;

/** Размер крупных форм рельефа: доля суммы сторон карты. */
const FEATURE_SCALE = 1 / 4;

/** Число слоёв шума: каждый следующий вдвое мельче и вдвое слабее. */
const OCTAVES = 2;

/**
 * Сила искривления координат в долях масштаба рельефа; вытягивает полуострова.
 * При значениях около 1 рельеф складывается сам на себя и рассыпается на пятна.
 */
const WARP_STRENGTH = 0.6;

/** Во сколько раз шум искривления крупнее шума высоты. */
const WARP_SCALE = 2;

/** Смещение, разводящее шумы искривления по осям. */
const WARP_OFFSET = 100;

/** Контраст высот: компенсирует сглаживание от усреднения октав. */
const CONTRAST = 1.5;

/** Ширина полосы вдоль центральной диагонали, где смешиваются половины карты. */
const MIRROR_BLEND = 0.2;

/**
 * Расстояния от стартового угла: ближе `inner` рельеф полностью выровнен
 * в равнину, дальше `outer` не меняется. Задаются в клетках и в долях меньшей
 * стороны карты; берётся меньшее, чтобы на маленьких картах остался рельеф.
 */
const START_PLAIN = {
  inner: { cells: 3, share: 0.2 },
  outer: { cells: 7, share: 0.5 },
};

/**
 * Плавно переводит значение из отрезка в диапазон от 0 до 1.
 *
 * @param from - Значение, которому соответствует 0.
 * @param to - Значение, которому соответствует 1.
 * @param value - Переводимое значение.
 * @returns Сглаженная доля от 0 до 1.
 */
const smoothstep = (from: number, to: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/**
 * Создаёт фрактальный шум из нескольких октав simplex-шума.
 *
 * @param random - Генератор случайных чисел для перестановок шума.
 * @returns Шум от -1 до 1 в координатах шума.
 */
const createFractalNoise = (random: () => number): HeightField => {
  const noise2D = createNoise2D(random);

  return (x, y) => {
    let sum = 0;
    let amplitude = 1;
    let totalAmplitude = 0;
    for (let octave = 0; octave < OCTAVES; octave++) {
      const frequency = 2 ** octave;
      sum += noise2D(x * frequency, y * frequency) * amplitude;
      totalAmplitude += amplitude;
      amplitude /= 2;
    }
    return sum / totalAmplitude;
  };
};

/**
 * Создаёт поле высот с искривлёнными координатами (domain warping).
 *
 * Координаты сдвигаются двумя независимыми шумами перед чтением высоты,
 * поэтому берега изгибаются в мысы, заливы и полуострова.
 *
 * @param random - Генератор случайных чисел.
 * @param scale - Размер крупных форм рельефа в клетках.
 * @returns Высота в координатах клеток.
 */
const createWarpedHeight = (
  random: () => number,
  scale: number,
): HeightField => {
  const height = createFractalNoise(random);
  const warp = createNoise2D(random);
  const warpScale = scale * WARP_SCALE;

  return (x, y) => {
    const dx = warp(x / warpScale, y / warpScale);
    const dy = warp(x / warpScale + WARP_OFFSET, y / warpScale + WARP_OFFSET);
    return height(
      x / scale + dx * WARP_STRENGTH,
      y / scale + dy * WARP_STRENGTH,
    );
  };
};

/**
 * Делает поле высот симметричным относительно центра карты.
 *
 * Стороны стартуют в противоположных углах, поэтому одинаковый рельеф
 * у обеих сторон делает карту честной. Каждая половина карты по разные
 * стороны центральной диагонали берёт высоту из своей точки поля, а в полосе
 * {@link MIRROR_BLEND} у диагонали половины плавно смешиваются без шва.
 * Простое усреднение двух точек сгладило бы рельеф по всей карте.
 *
 * @param field - Исходное поле высот.
 * @param width - Ширина карты в клетках.
 * @param height - Высота карты в клетках.
 * @returns Поле, где клетка и её зеркальная клетка имеют одну высоту.
 */
const mirrorAroundCenter =
  (field: HeightField, width: number, height: number): HeightField =>
  (x, y) => {
    // Считаем от клетки пары с меньшим индексом: так зеркальные клетки
    // получают бит в бит одинаковую высоту без погрешности округления.
    const isCanonical = x + y * width <= width * height - 1 - (x + y * width);
    const [cx, cy] = isCanonical ? [x, y] : [width - 1 - x, height - 1 - y];
    const [mx, my] = [width - 1 - cx, height - 1 - cy];
    const side =
      (cx - (width - 1) / 2) / width + (cy - (height - 1) / 2) / height;
    const weight = smoothstep(-MIRROR_BLEND, MIRROR_BLEND, side);
    return field(cx, cy) * weight + field(mx, my) * (1 - weight);
  };

/**
 * Выравнивает рельеф у стартовых углов, чтобы базы стояли на суше.
 *
 * Стороны стартуют в левом верхнем и правом нижнем углах; высота у них
 * плавно стягивается к нулю — к равнине.
 *
 * @param field - Исходное поле высот.
 * @param width - Ширина карты в клетках.
 * @param height - Высота карты в клетках.
 * @returns Поле с равнинами у стартовых углов.
 */
const flattenStartCorners = (
  field: HeightField,
  width: number,
  height: number,
): HeightField => {
  const side = Math.min(width, height);
  const inner = Math.min(
    START_PLAIN.inner.cells,
    side * START_PLAIN.inner.share,
  );
  const outer = Math.min(
    START_PLAIN.outer.cells,
    side * START_PLAIN.outer.share,
  );

  return (x, y) => {
    const distance = Math.min(
      Math.hypot(x, y),
      Math.hypot(width - 1 - x, height - 1 - y),
    );
    return field(x, y) * smoothstep(inner, outer, distance);
  };
};

/**
 * Возвращает тип рельефа для высоты.
 *
 * @param value - Высота клетки.
 * @returns Тип клетки без учёта золота.
 */
const getTerrainType = (value: number): CellType => {
  if (value < -0.42) return 'water';
  if (value > 0.75) return 'mountain';
  if (value > 0.55) return 'forest';
  return 'grass';
};

/**
 * Генерирует рельеф карты, симметричный относительно её центра.
 *
 * @param width - Ширина карты в клетках.
 * @param height - Высота карты в клетках.
 * @param random - Генератор случайных чисел.
 * @returns Клетки карты без золота, индексируемые как `grid[y][x]`.
 */
export const generateTerrain = (
  width: number,
  height: number,
  random: () => number,
): Cell[][] => {
  const scale = (width + height) * FEATURE_SCALE;
  const field = flattenStartCorners(
    mirrorAroundCenter(createWarpedHeight(random, scale), width, height),
    width,
    height,
  );

  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x): Cell => {
      const type = getTerrainType(field(x, y) * CONTRAST);
      return { x, y, type, isWalkable: type === 'grass' };
    }),
  );
};
