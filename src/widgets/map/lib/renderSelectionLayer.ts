import { Building, Position, Unit } from '@shared/config';
import type { Selection } from '@features/selection';
import {
  drawHoverHighlight,
  drawSelectionHighlight,
} from './drawSelectionHighlight';
import { drawAttackRange, drawPath } from './drawPath';
import { drawTerrainHighlight } from './drawTerrain';

type Options = {
  /** Клетка под курсором. */
  hover?: Position | null;
  /** Маршрут до клетки под курсором. */
  path?: number[][] | null;
  /** Цели, доступные выбранной сущности прямо сейчас. */
  attackableTargets?: Position[] | null;
  /** Фаза пульсации выделения от 0 до 1. */
  pulse?: number;
};

export const renderSelectionLayer = (
  ctx: CanvasRenderingContext2D,
  buildings: Record<string, Building>,
  units: Record<string, Unit>,
  selection: Selection | null,
  cellSize: number,
  { hover, path, attackableTargets, pulse = 0 }: Options = {},
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
};
