import type { AiRule } from '../../model/types';
import { W01, W02, W03, W04, W05 } from './workers';
import { W07, W08, W09 } from './construction';
import { W06 } from './farms';
import { W10 } from './passage';
import { X01 } from './clearing';
import { M01, M02, M05, M06 } from './soldiers';
import { M03, M04 } from './assault';
import { A02, A03, A05, A07 } from './archers';
import { A01, A04, A06 } from './archerMoves';
import { T01, T02, T03, T04, T05 } from './towers';
import { N01, N02 } from './production';
import { N03 } from './recruitment';
import { G05, G07, G10 } from './scouting';
import { R01, R02, R03 } from './scouts';
import { R04, R05, R06 } from './scoutWatch';
import { P01, P02, P03, P04, P05 } from './spearmen';
import { C01, C02, C03, C04 } from './riders';
import { C05, C06 } from './riderMoves';
import { O02, O05, O06 } from './siege';
import { O01, O03, O04, X02 } from './siegeMoves';
import { H01, H02, H03, H04 } from './healers';
import { K01, K02, K03, K04 } from './mages';
import { F01, F02, F03, F04 } from './griffons';

export * from './workers';
export * from './construction';
export * from './farms';
export * from './passage';
export * from './clearing';
export * from './soldiers';
export * from './assault';
export * from './archers';
export * from './archerMoves';
export * from './towers';
export * from './production';
export * from './recruitment';
export * from './scouting';
export * from './scouts';
export * from './scoutWatch';
export * from './spearmen';
export * from './riders';
export * from './riderMoves';
export * from './siege';
export * from './siegeMoves';
export * from './healers';
export * from './mages';
export * from './griffons';

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
  X02,
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
  R01,
  R02,
  R03,
  R04,
  R05,
  R06,
  P01,
  P02,
  P03,
  P04,
  P05,
  C01,
  C02,
  C03,
  C04,
  C05,
  C06,
  O01,
  O02,
  O03,
  O04,
  O05,
  O06,
  H01,
  H02,
  H03,
  H04,
  K01,
  K02,
  K03,
  K04,
  F01,
  F02,
  F03,
  F04,
  N01,
  N02,
  N03,
  G05,
  G07,
  G10,
];
