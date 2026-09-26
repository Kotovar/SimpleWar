import type { Building, Position, Unit } from '@shared/config';
import type { MapClickContext } from './mapClickContext';

export type { MapClickContext };

const isHighlighted = (cells: Position[] | null, x: number, y: number) =>
  !!cells?.some(cell => cell.x === x && cell.y === y);

/** Полный сброс интерактивного выбора: выбор, движение и подсветка стройки/найма. */
const resetInteraction = ({ ui }: MapClickContext) => {
  ui.clearSelection();
  ui.clearMovement();
  ui.clearHighlight();
};

// Выбор объекта под курсором. Подсветку стройки/найма здесь не трогаем:
// её снимает вызывающая ветка, если она была активна.
const selectClicked = (x: number, y: number, ctx: MapClickContext) => {
  const { clicked, ui, humanId } = ctx;
  ui.clearSelection();
  ui.clearMovement();

  if (clicked.building) {
    ui.selectBuilding(clicked.building.id);
    if (
      clicked.building.owner === humanId &&
      clicked.building.role === 'combat'
    ) {
      ui.calculateActionHighlights(clicked.building.id);
    }
    return;
  }

  if (clicked.unit) {
    ui.selectUnit(clicked.unit.id);
    if (clicked.unit.owner === humanId) {
      ui.calculateActionHighlights(clicked.unit.id);
    }
    return;
  }

  ui.selectCell(x, y);
};

const clickWithOwnUnit = (
  unit: Unit,
  x: number,
  y: number,
  ctx: MapClickContext,
) => {
  const { clicked, selection, highlights, commands, humanId: actor } = ctx;
  const target = clicked.unit ?? clicked.building;

  if (unit.movePoints > 0 && isHighlighted(highlights.reachable, x, y)) {
    commands.move({ actor, unitId: unit.id, x, y });
    resetInteraction(ctx);
    return;
  }

  if (
    target &&
    unit.role !== 'civil' &&
    unit.attackPoints > 0 &&
    isHighlighted(highlights.attackable, x, y)
  ) {
    commands.attack({ actor, attackerId: unit.id, targetId: target.id });
    resetInteraction(ctx);
    return;
  }

  if (
    unit.role === 'civil' &&
    commands.clearForest &&
    isHighlighted(highlights.clearable ?? null, x, y)
  ) {
    commands.clearForest({ actor, workerId: unit.id, x, y });
    resetInteraction(ctx);
    return;
  }

  if (
    unit.type === 'worker' &&
    unit.role === 'civil' &&
    selection.buildingTypeToPlace &&
    isHighlighted(highlights.buildable, x, y)
  ) {
    commands.build({
      actor,
      workerId: unit.id,
      buildingType: selection.buildingTypeToPlace,
      x,
      y,
    });
    resetInteraction(ctx);
    return;
  }

  ctx.ui.clearHighlight();
  selectClicked(x, y, ctx);
};

const clickWithOwnBuilding = (
  building: Building,
  x: number,
  y: number,
  ctx: MapClickContext,
) => {
  const { clicked, selection, highlights, commands, humanId: actor } = ctx;
  const target = clicked.unit ?? clicked.building;

  if (
    building.role === 'combat' &&
    target &&
    isHighlighted(highlights.attackable, x, y)
  ) {
    commands.attack({ actor, attackerId: building.id, targetId: target.id });
    resetInteraction(ctx);
    return;
  }

  if (
    building.role === 'production' &&
    building.spawnPoints > 0 &&
    selection.unitTypeToSpawn &&
    isHighlighted(highlights.spawnable, x, y)
  ) {
    commands.spawn({
      actor,
      buildingId: building.id,
      unitType: selection.unitTypeToSpawn,
      x,
      y,
    });
    resetInteraction(ctx);
    return;
  }

  ctx.ui.clearHighlight();
  selectClicked(x, y, ctx);
};

/**
 * Переводит клик по клетке в намерение: приказ по подсвеченной клетке
 * либо смену выбора. Приоритет задан порядком проверок: движение, атака,
 * расчистка, строительство или найм, затем выбор объекта под курсором.
 * Результат команды пока не влияет на очистку выбора; сообщение об отказе — S19.
 *
 * @param x - Столбец клетки.
 * @param y - Строка клетки.
 * @param ctx - Клетка, выбор, подсветка, команды и действия интерфейса.
 */
export const handleMapCellClick = (
  x: number,
  y: number,
  ctx: MapClickContext,
) => {
  const { unit, building } = ctx.selection;

  // Повторный клик по выделению или любой клик при выбранной чужой
  // сущности снимает выделение.
  const selectedOwner = (unit ?? building)?.owner;
  if (
    ctx.selection.isCurrent(x, y) ||
    (selectedOwner !== undefined && selectedOwner !== ctx.humanId)
  ) {
    resetInteraction(ctx);
    return;
  }

  if (unit) clickWithOwnUnit(unit, x, y, ctx);
  else if (building) clickWithOwnBuilding(building, x, y, ctx);
  else selectClicked(x, y, ctx);
};
