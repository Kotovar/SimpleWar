/**
 * Возвращает постоянное значение для координат клетки и соли.
 *
 * @param x - Координата клетки по горизонтали.
 * @param y - Координата клетки по вертикали.
 * @param salt - Число для независимой раскладки декора.
 * @returns Значение от 0 включительно до 1 исключительно.
 */
export const sample = (x: number, y: number, salt: number) => {
  let value = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ salt;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 0x100000000;
};

const smoothstep = (t: number) => t * t * (3 - 2 * t);

/**
 * Возвращает сглаженный координатный шум для пятен лугов и рощ.
 *
 * @param x - Координата клетки по горизонтали.
 * @param y - Координата клетки по вертикали.
 * @param scale - Положительный шаг узлов шума в клетках.
 * @param salt - Число для независимого рисунка шума.
 * @returns Значение от 0 до 1.
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
