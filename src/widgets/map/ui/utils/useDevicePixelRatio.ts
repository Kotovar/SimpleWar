import { useEffect, useState } from 'react';

/**
 * Следит за плотностью пикселей экрана.
 *
 * Плотность меняется при переносе окна на другой монитор, смене масштаба
 * системы или зума браузера. Слои карты пересобираются только по этому
 * значению: иначе буфер остаётся от прежней плотности и картинка мылит.
 */
export const useDevicePixelRatio = () => {
  const [ratio, setRatio] = useState(() => window.devicePixelRatio || 1);

  useEffect(() => {
    const media = window.matchMedia(`(resolution: ${ratio}dppx)`);
    const onChange = () => setRatio(window.devicePixelRatio || 1);

    media.addEventListener('change', onChange);

    return () => media.removeEventListener('change', onChange);
  }, [ratio]);

  return ratio;
};
