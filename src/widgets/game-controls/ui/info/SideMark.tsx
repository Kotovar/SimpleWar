import {
  getParticipantPalette,
  PALETTES,
  TEAM_MARKERS,
  type Owner,
  type Participant,
} from '@shared/config';
import styles from './SideMark.styles.module.css';

/**
 * Маркер стороны: цвет палитры участника и форма слота, как на постаментах
 * карты. Форма различает стороны без распознавания цвета.
 */
export const SideMark = ({
  owner,
  participants,
}: {
  owner: Owner;
  participants: readonly Participant[];
}) => (
  <span
    className={styles.Mark}
    data-shape={TEAM_MARKERS[owner].marker}
    style={{
      ['--side-color' as string]:
        PALETTES[getParticipantPalette(owner, participants)].color,
    }}
    aria-hidden
  />
);
