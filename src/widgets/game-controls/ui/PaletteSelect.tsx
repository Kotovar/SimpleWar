import {
  PALETTES,
  PALETTE_IDS,
  PARTICIPANT_IDS,
  type PaletteChoice,
  type ParticipantId,
} from '@shared/config';
import { Select } from '@shared/ui';
import { useSettingsStore } from '@entities/settings';
import styles from './styles.module.css';

export const PaletteSelect = ({
  owner,
  label,
}: {
  owner: ParticipantId;
  label: string;
}) => {
  const choices = useSettingsStore(state => state.paletteChoices);
  const count = useSettingsStore(state => state.aiSetups.length);
  const setChoice = useSettingsStore(state => state.setPaletteChoice);
  const taken = PARTICIPANT_IDS.slice(0, count + 1)
    .filter(id => id !== owner)
    .map(id => choices[id]);
  const choice = choices[owner];
  return (
    <label className={styles.AiField}>
      <span className={styles.Label}>
        {label}
        <span
          className={styles.PaletteSwatch}
          aria-hidden
          style={{
            background:
              choice === 'random' ? undefined : PALETTES[choice].color,
          }}
        />
      </span>
      <Select<PaletteChoice>
        name={`palette-${owner}`}
        value={choice}
        options={[
          { value: 'random', label: 'Случайный' },
          ...PALETTE_IDS.map(value => ({
            value,
            label: PALETTES[value].name,
            disabled: taken.includes(value),
          })),
        ]}
        onChange={value => setChoice(owner, value)}
      />
    </label>
  );
};
