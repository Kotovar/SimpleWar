import type { Building, Position, Unit } from '@shared/config';
import { getHealAmount } from '@features/combat';
import { calculateDamage } from '@shared/lib';
import { getResearchArmor } from '@entities/researches';
import type { Selection } from '@features/selection';
import {
  drawHoverHighlight,
  drawSelectionHighlight,
} from './drawSelectionHighlight';
import { drawAttackRange, drawPath, type MovePath } from './drawPath';
import { drawTerrainHighlight } from './drawTerrain';
import { drawDamagePreview } from './drawDamagePreview';

type Options = {
  /** Клетка под курсором. */
  hover?: Position | null;
  /** Маршрут до клетки под курсором. */
  path?: MovePath | null;
  /** Цели, доступные выбранной сущности прямо сейчас. */
  attackableTargets?: Position[] | null;
  /** Свои раненые, которых может вылечить выбранный лекарь. */
  healTargets?: Unit[] | null;
  /** Показывать точку сбора: только у выбранного своего здания. */
  showRallyPoint?: boolean;
  /** Фаза пульсации выделения от 0 до 1. */
  pulse?: number;
};

export const renderSelectionLayer = (
  ctx: CanvasRenderingContext2D,
  buildings: Record<string, Building>,
  units: Record<string, Unit>,
  selection: Selection | null,
  cellSize: number,
  {
    hover,
    path,
    attackableTargets,
    healTargets,
    showRallyPoint = false,
    pulse = 0,
  }: Options = {},
) => {
  if (hover) drawHoverHighlight(ctx, hover.x, hover.y, cellSize);

  if (!selection) return;

  // Рамку дальности показываем только когда есть кого атаковать: без целей
  // она лишь мешает читать клетки движения.
  const hasTargets = (attackableTargets?.length ?? 0) > 0;

  if (selection.kind === 'unit') {
    const unit = units[selection.id];
    if (unit) {
      if (unit.role === 'military' && hasTargets) {
        drawAttackRange(ctx, unit.x, unit.y, unit.attackRange, cellSize);
      }
      drawSelectionHighlight(ctx, unit.x, unit.y, cellSize, 'entity', pulse);
    }
  }

  if (selection.kind === 'building') {
    const building = buildings[selection.id];
    if (building) {
      if (
        showRallyPoint &&
        building.role === 'production' &&
        building.rallyPoint
      ) {
        const { x, y } = building.rallyPoint;
        drawTerrainHighlight(ctx, x, y, cellSize, pulse);
        ctx.save();
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f5d98f';
        ctx.strokeStyle = '#202c30';
        ctx.lineWidth = 3;
        ctx.strokeText('Сбор', (x + 0.5) * cellSize, (y + 0.5) * cellSize);
        ctx.fillText('Сбор', (x + 0.5) * cellSize, (y + 0.5) * cellSize);
        ctx.restore();
      }
      if (building.role === 'combat' && hasTargets) {
        drawAttackRange(
          ctx,
          building.x,
          building.y,
          building.attackRange,
          cellSize,
        );
      }
      drawSelectionHighlight(
        ctx,
        building.x,
        building.y,
        cellSize,
        'entity',
        pulse,
      );
    }
  }

  if (selection.kind === 'cell') {
    drawTerrainHighlight(ctx, selection.x, selection.y, cellSize, pulse);
  }

  if (path) drawPath(ctx, path, cellSize);

  // Ожидаемый урон по цели под курсором: та же формула, что у команды.
  const attacker =
    selection.kind === 'unit'
      ? units[selection.id]
      : selection.kind === 'building'
        ? buildings[selection.id]
        : undefined;
  const aimed =
    hover &&
    attackableTargets?.some(({ x, y }) => x === hover.x && y === hover.y);
  // Ожидаемое лечение: «+N», не выше недостающего HP.
  const healing =
    hover && healTargets?.find(({ x, y }) => x === hover.x && y === hover.y);
  if (hover && healing && attacker && 'attack' in attacker) {
    drawDamagePreview(
      ctx,
      hover.x,
      hover.y,
      cellSize,
      getHealAmount(attacker.type as Unit['type'], healing),
      false,
      'heal',
    );
  }

  if (hover && aimed && attacker && 'attack' in attacker) {
    const target =
      Object.values(units).find(u => u.x === hover.x && u.y === hover.y) ??
      Object.values(buildings).find(b => b.x === hover.x && b.y === hover.y);
    if (target) {
      // Строй считается по видимым соседям: туман не раскрывается.
      const damage = calculateDamage(
        attacker,
        target,
        getResearchArmor(target, Object.values(units)),
      );
      drawDamagePreview(
        ctx,
        hover.x,
        hover.y,
        cellSize,
        damage,
        damage >= target.hp,
      );
    }
  }
};
