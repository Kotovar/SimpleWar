// Во время восстановления подписчики не должны наблюдать промежуточный мир.
let restoring = false;
export const isRestoringGame = () => restoring;
export const restoreGameState = (apply: () => void) => {
  restoring = true;
  try {
    apply();
  } finally {
    restoring = false;
  }
};
