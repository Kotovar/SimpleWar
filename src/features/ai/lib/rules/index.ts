import type { AiRule } from '../../model/types';
import { W01, W02, W03, W04, W05 } from './workers';
import { W06, W07, W08, W09 } from './construction';
import { W10 } from './passage';
import { X01 } from './clearing';
import { M01, M02, M05, M06 } from './soldiers';
import { M03, M04 } from './assault';
import { A02, A03, A05, A07 } from './archers';
import { A01, A04, A06 } from './archerMoves';
import { T01, T02, T03, T04, T05 } from './towers';
import { N01, N02 } from './production';
import { G05, G07, G10 } from './scouting';

export * from './workers';
export * from './construction';
export * from './passage';
export * from './clearing';
export * from './soldiers';
export * from './assault';
export * from './archers';
export * from './archerMoves';
export * from './towers';
export * from './production';
export * from './scouting';

/**
 * Реестр правил: новое правило добавляется сюда, общий цикл хода не
 * меняется. Порядок не влияет на выбор — только оценка и сид.
 */
export const AI_RULES: AiRule[] = [
  W01,
  W02,
  W03,
  W04,
  W05,
  W06,
  W07,
  W08,
  W09,
  W10,
  X01,
  M01,
  M02,
  M03,
  M04,
  M05,
  M06,
  A01,
  A02,
  A03,
  A04,
  A05,
  A06,
  A07,
  T01,
  T02,
  T03,
  T04,
  T05,
  N01,
  N02,
  G05,
  G07,
  G10,
];
