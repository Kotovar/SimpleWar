import { RESEARCH_CONFIG } from '@shared/config';
import type { AiAction } from '../model/types';

/** Короткий ID для текста журнала; полный ID остаётся в полях записи. */
const short = (id: string) => id.slice(0, 13);

/** Действие ИИ текстом для журнала решений. */
export const describe = (action: AiAction) => {
  switch (action.type) {
    case 'move':
      return `движение в (${action.x}, ${action.y})`;
    case 'attack':
      return `атака ${short(action.targetId)}`;
    case 'heal':
      return `лечение ${short(action.targetId)}`;
    case 'prepareStrike':
      return `подготовка удара по (${action.x}, ${action.y})`;
    case 'build':
      return `стройка ${action.buildingType} в (${action.x}, ${action.y})`;
    case 'spawn':
      return `найм ${action.unitType}`;
    case 'assign':
      return `на добычу ${short(action.buildingId)}`;
    case 'unassign':
      return 'снят с добычи';
    case 'repair':
      return `ремонт ${short(action.buildingId)}`;
    case 'clearForest':
      return `расчистка (${action.x}, ${action.y})`;
    case 'demolish':
      return `снос ${short(action.buildingId)}`;
    case 'startResearch':
      return `исследование ${RESEARCH_CONFIG[action.research].name}`;
    case 'wait':
      return 'ожидание';
  }
};
