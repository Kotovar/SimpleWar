import { useEffect, useRef } from 'react';
import {
  getTeamStyle,
  type BuildingType,
  type Owner,
  type UnitType,
  type PaletteId,
} from '@shared/config';
import { renderHiDpiCanvas } from '@shared/lib';
import { drawBarracks, drawBase, drawTower } from './drawBuildings';
import { drawFarm, drawGoldMine, drawSawmill } from './drawEconomyBuildings';
import { drawArcher, drawSwordsman, drawWorker } from './drawUnits';
import {
  drawHorseArcher,
  drawKnight,
  drawRider,
  drawScout,
  drawSiege,
  drawSpearman,
} from './drawNewUnits';
import {
  drawForge,
  drawPalisade,
  drawBeacon,
  drawOutpost,
  drawSanctuary,
  drawStable,
  drawWorkshop,
} from './drawNewBuildings';
import { drawGriffon, drawHealer, drawMage } from './drawMagicUnits';
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
  scout: drawScout,
  spearman: drawSpearman,
  rider: drawRider,
  knight: drawKnight,
  horseArcher: drawHorseArcher,
  siege: drawSiege,
  stable: drawStable,
  workshop: drawWorkshop,
  forge: drawForge,
  palisade: drawPalisade,
  beacon: drawBeacon,
  outpost: drawOutpost,
  sanctuary: drawSanctuary,
  mage: drawMage,
  healer: drawHealer,
  griffon: drawGriffon,
} satisfies Record<BuildingType | UnitType, unknown>;

type Props = {
  type: BuildingType | UnitType;
  owner: Owner;
  size?: number;
  palette?: PaletteId;
};

/** Показывает сущность тем же рисунком, что и на карте. */
export const EntityPortrait = ({ type, owner, size = 48, palette }: Props) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const team = getTeamStyle(owner, palette);
    return renderHiDpiCanvas(canvas, size, ctx =>
      type === 'siege'
        ? drawSiege(ctx, 0, 0, size, owner, 1, undefined, team)
        : DRAW_ENTITY[type](ctx, 0, 0, size, owner, 1, team),
    );
  }, [type, owner, size, palette]);

  return (
    <canvas
      ref={ref}
      className={styles.Portrait}
      style={{ width: size, height: size }}
      aria-hidden='true'
    />
  );
};
