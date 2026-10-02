import { useEffect, useState } from 'react';

type LayoutMap = ReadonlyMap<string, string>;
type KeyboardApi = { getLayoutMap?: () => Promise<LayoutMap> };

/** Раскладка клавиатуры для подписей, если браузер её сообщает. */
export const useLayoutMap = () => {
  const [layout, setLayout] = useState<LayoutMap | null>(null);
  useEffect(() => {
    const keyboard = (navigator as Navigator & { keyboard?: KeyboardApi })
      .keyboard;
    keyboard
      ?.getLayoutMap?.()
      .then(setLayout)
      .catch(() => {});
  }, []);
  return layout;
};
