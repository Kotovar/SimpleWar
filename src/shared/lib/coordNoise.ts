// Координатный шум: декор не меняет положение при перерисовке карты.
export const sample = (x: number, y: number, salt: number) => {
  let value = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ salt;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 0x100000000;
};

const smoothstep = (t: number) => t * t * (3 - 2 * t);

/**
 * Плавный шум от 0 до 1: значения `sample` в узлах решётки с шагом `scale`
 * клеток, сглаженные между узлами. Соседние клетки получают близкие значения,
 * поэтому из него складываются пятна лугов и рощ, а не рябь.
 */
export const smoothNoise = (
  x: number,
  y: number,
  scale: number,
  salt: number,
) => {
  const gx = Math.floor(x / scale);
  const gy = Math.floor(y / scale);
  const tx = smoothstep(x / scale - gx);
  const ty = smoothstep(y / scale - gy);
  const top = sample(gx, gy, salt) * (1 - tx) + sample(gx + 1, gy, salt) * tx;
  const bottom =
    sample(gx, gy + 1, salt) * (1 - tx) + sample(gx + 1, gy + 1, salt) * tx;
  return top * (1 - ty) + bottom * ty;
};
