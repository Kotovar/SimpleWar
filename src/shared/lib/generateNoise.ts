export const generateNoise = (gridSize: number, amplitude: number) => {
  return Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => (Math.random() - 0.5) * amplitude),
  );
};
