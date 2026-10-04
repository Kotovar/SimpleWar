import type { AiRule } from '../../model/types';
import { roleWishes } from '../composition';
import { desiredArmy } from '../facts';
import { canHire, hire, producers } from './production';

/**
 * N03 (G04): нужна новая роль по известному составу врага — нанять её,
 * если есть здание найма и бюджет. Как и N02, армия не растёт сверх
 * нужного; контрюнит против видимой угрозы — и при полной армии.
 */
export const N03: AiRule = {
  id: 'N03',
  group: 'hire',
  title: 'Найм новых ролей',
  evaluate: ctx => {
    const lack = desiredArmy(ctx) - ctx.military.length;
    for (const wish of roleWishes(ctx)) {
      const counter = wish.type === 'spearman' || wish.type === 'mage';
      if (lack <= 0 && !counter) continue;
      for (const building of producers(ctx)) {
        if (!canHire(ctx, building, wish.type)) continue;
        const candidates = hire(
          ctx,
          'N03',
          'hire',
          building,
          wish.type,
          50 + Math.max(0, lack) * 4 + (counter ? 10 : 0),
          wish.reason,
        );
        if (candidates.length) return candidates;
      }
    }
    return [];
  },
};
