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
  const { selection, highlights, commands, humanId: actor } = ctx;

  // Режим прицела осады важнее движения: клетки могут совпадать.
  if (
    unit.type === 'siege' &&
    commands.prepareStrike &&
    isHighlighted(highlights.strike ?? null, x, y)
  ) {
    commands.prepareStrike({ actor, unitId: unit.id, x, y });
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
  const { selection, highlights, commands, humanId: actor } = ctx;
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

/** ЛКМ выбирает объект или подтверждает режим стройки, найма, расчистки, прицела. */
export const handleMapCellClick = (
  x: number,
  y: number,
  ctx: MapClickContext,
) => {
  const { unit, building } = ctx.selection;

  if (ctx.selection.isCurrent(x, y)) {
    resetInteraction(ctx);
    return;
  }
  const selectedOwner = (unit ?? building)?.owner;
  if (selectedOwner !== undefined && selectedOwner !== ctx.humanId) {
    ctx.ui.clearHighlight();
    selectClicked(x, y, ctx);
    return;
  }

  if (unit) clickWithOwnUnit(unit, x, y, ctx);
  else if (building) clickWithOwnBuilding(building, x, y, ctx);
  else selectClicked(x, y, ctx);
};

/** ПКМ отдаёт прямой приказ выбранному своему объекту, заменяя прежнее намерение. */
export const handleMapCellOrder = (
  x: number,
  y: number,
  ctx: MapClickContext,
) => {
  const { selection, clicked, highlights, commands, humanId: actor } = ctx;
  const entity = selection.unit ?? selection.building;
  if (!entity || entity.owner !== actor || selection.isCurrent(x, y)) return;
  const target = clicked.unit ?? clicked.building;
  const healTarget =
    highlights.heal?.find(cell => cell.x === x && cell.y === y) ?? clicked.unit;
  let result;
  if (target && target.owner !== actor) {
    result = commands.attack({
      actor,
      attackerId: entity.id,
      targetId: target.id,
    });
  } else if (selection.unit?.type === 'healer' && healTarget && commands.heal) {
    result = commands.heal({
      actor,
      healerId: entity.id,
      targetId: healTarget.id,
    });
  } else if (selection.unit && !target) {
    result = isHighlighted(highlights.reachable, x, y)
      ? commands.move({ actor, unitId: entity.id, x, y })
      : commands.goTo?.({ actor, unitId: entity.id, x, y });
  }
  if (!result) return;
  // Ошибка сохраняет намерение и выбор; успешная команда снимает режимы.
  if (result.ok) {
    resetInteraction(ctx);
    if (selection.unit) ctx.ui.selectUnit(entity.id);
    else ctx.ui.selectBuilding(entity.id);
    ctx.ui.calculateActionHighlights(entity.id);
  }
};
