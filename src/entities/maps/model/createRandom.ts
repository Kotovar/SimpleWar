export const createRandom = (seed: number | undefined) => {
  let randomState = Math.floor((seed ?? Math.random()) * 0xffffffff) >>> 0;

  return () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 0x100000000;
  };
};
