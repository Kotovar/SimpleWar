import { useEffect, useRef } from 'react';
import type { BuildingType, Owner, UnitType } from '@shared/config';
import { renderHiDpiCanvas } from '@shared/lib';
import { drawBarracks, drawBase, drawTower } from './drawBuildings';
import { drawFarm, drawGoldMine, drawSawmill } from './drawEconomyBuildings';
import { drawArcher, drawSwordsman, drawWorker } from './drawUnits';
import styles from './styles.module.css';

const DRAW_ENTITY = {
  base: drawBase,
  mine: drawGoldMine,
  sawmill: drawSawmill,
  farm: drawFarm,
  barracks: drawBarracks,
  tower: drawTower,
  worker: drawWorker,
  swordsman: drawSwordsman,
  archer: drawArcher,
};

type Props = {
  type: BuildingType | UnitType;
  owner: Owner;
  size?: number;
};

/** Показывает сущность тем же рисунком, что и на карте. */
export const EntityPortrait = ({ type, owner, size = 48 }: Props) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    return renderHiDpiCanvas(canvas, size, ctx =>
      DRAW_ENTITY[type](ctx, 0, 0, size, owner),
    );
  }, [type, owner, size]);

  return (
    <canvas
      ref={ref}
      className={styles.Portrait}
      style={{ width: size, height: size }}
      aria-hidden='true'
    />
  );
};
