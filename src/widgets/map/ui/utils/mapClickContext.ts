import type {
  Building,
  BuildingType,
  CommandResult,
  Owner,
  Position,
  Unit,
  UnitType,
} from '@shared/config';
import type { MoveCommand } from '@features/pathfinding';
import type { AttackCommand } from '@features/combat';
import type { BuildCommand } from '@features/build';
import type { SpawnCommand } from '@features/spawn';
import type { ClearForestCommand } from '@features/workers';

/** Всё, что нужно клику: где кликнули, что выбрано, что подсвечено и чем ответить. */
export type MapClickContext = {
  /** Участник, которым управляет человек; его объекты — «свои». */
  humanId: Owner;
  /** Объекты в клетке клика. */
  clicked: { unit: Unit | null; building: Building | null };
  /** Текущий выбор интерфейса. */
  selection: {
    unit: Unit | null;
    building: Building | null;
    /** Здание, выбранное рабочему для постройки. */
    buildingTypeToPlace: BuildingType | null;
    /** Юнит, выбранный зданию для найма. */
    unitTypeToSpawn: UnitType | null;
    isCurrent: (x: number, y: number) => boolean;
  };
  /** Подсвеченные клетки: только по ним клик превращается в приказ. */
  highlights: {
    reachable: Position[] | null;
    attackable: Position[] | null;
    buildable: Position[] | null;
    spawnable: Position[] | null;
    /** Клетки леса в режиме расчистки. */
    clearable?: Position[] | null;
  };
  /** Игровые команды — те же, что вызывает ИИ. */
  commands: {
    move: (command: MoveCommand) => CommandResult;
    attack: (command: AttackCommand) => CommandResult;
    build: (command: BuildCommand) => CommandResult;
    spawn: (command: SpawnCommand) => CommandResult;
    clearForest?: (command: ClearForestCommand) => CommandResult;
  };
  /** Изменение выбора и подсветки в интерфейсе. */
  ui: {
    selectUnit: (id: string) => void;
    selectBuilding: (id: string) => void;
    selectCell: (x: number, y: number) => void;
    /** Клетки движения и цели атаки выбранного юнита или башни. */
    calculateActionHighlights: (entityId: string) => void;
    /** Снимает выбор вместе с выбранным типом стройки и найма. */
    clearSelection: () => void;
    clearMovement: () => void;
    clearHighlight: () => void;
  };
};
