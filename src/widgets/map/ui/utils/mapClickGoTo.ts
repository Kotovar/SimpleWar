import type { Unit } from '@shared/config';
import type { MapClickContext } from './mapClickContext';

/**
 * Клик своим юнитом по далёкой клетке без объекта: первый клик отмечает
 * цель, второй по ней же отдаёт приказ «Идти в точку». Клик по другой
 * клетке заменяет отметку. В режимах стройки, расчистки и прицела не
 * срабатывает.
 *
 * @returns `ordered` — приказ отдан, `planned` — цель отмечена, `null` —
 * клик не про приказ.
 */
export const clickGoTo = (
  unit: Unit,
  x: number,
  y: number,
  { clicked, selection, highlights, commands, ui, humanId }: MapClickContext,
) => {
  const inMode =
    !!selection.buildingTypeToPlace ||
    !!highlights.clearable ||
    !!highlights.strike;
  if (clicked.unit || clicked.building || inMode) return null;
  if (!commands.goTo || !ui.setPlannedTarget) return null;
  const planned = highlights.planned;
  if (planned?.unitId === unit.id && planned.x === x && planned.y === y) {
    commands.goTo({ actor: humanId, unitId: unit.id, x, y });
    return 'ordered';
  }
  if (!ui.canPlanRoute?.(unit, x, y)) return null;
  ui.setPlannedTarget({ unitId: unit.id, x, y });
  return 'planned';
};
