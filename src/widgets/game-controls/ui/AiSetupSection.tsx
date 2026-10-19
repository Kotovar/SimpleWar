import clsx from 'clsx';
import {
  AI_DIFFICULTY,
  AI_DIFFICULTY_TYPES,
  AI_PROFILE_TYPES,
  AI_PROFILES,
  PALETTES,
  PALETTE_IDS,
  PARTICIPANT_IDS,
  START_RESOURCES,
  type PaletteChoice,
  type ParticipantId,
} from '@shared/config';
import { EntityPortrait, GoldIcon, Select, WoodIcon } from '@shared/ui';
import { useSettingsStore } from '@entities/settings';
import { StepLabel } from './StepLabel';
import styles from './styles.module.css';

const PROFILE_OPTIONS = AI_PROFILE_TYPES.map(value => ({
  value,
  label: AI_PROFILES[value].name,
}));

const DIFFICULTY_OPTIONS = AI_DIFFICULTY_TYPES.map(value => ({
  value,
  label: AI_DIFFICULTY[value].name,
}));

/** «Случайный» — круг из всех палитр. */
const RANDOM_SWATCH = `conic-gradient(${[...PALETTE_IDS, PALETTE_IDS[0]]
  .map(id => PALETTES[id].color)
  .join(', ')})`;

/** Цвет стороны; занятые другими участниками цвета недоступны. */
const PaletteSelect = ({
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
  return (
    <Select<PaletteChoice>
      name={`palette-${owner}`}
      aria-label={label}
      value={choices[owner]}
      options={[
        { value: 'random', label: 'Случайный', swatch: RANDOM_SWATCH },
        ...PALETTE_IDS.map(value => ({
          value,
          label: PALETTES[value].name,
          disabled: taken.includes(value),
          swatch: PALETTES[value].color,
        })),
      ]}
      onChange={value => setChoice(owner, value)}
    />
  );
};

/** Ратуша в цвете стороны; при случайном цвете — знак вопроса. */
const SideBadge = ({
  owner,
  choice,
  name,
}: {
  owner: ParticipantId;
  choice: PaletteChoice;
  name: string;
}) => (
  <span className={styles.SideBadge}>
    {choice === 'random' ? (
      <span className={styles.RandomPortrait} aria-hidden>
        ?
      </span>
    ) : (
      <EntityPortrait type='base' owner={owner} palette={choice} size={36} />
    )}
    {name}
  </span>
);

const Stock = ({ gold, wood }: { gold: number; wood: number }) => (
  <span className={styles.SideStock} title='Стартовые запасы'>
    <span>
      <GoldIcon /> {gold}
    </span>
    <span>
      <WoodIcon /> {wood}
    </span>
  </span>
);

/**
 * Стороны обычной партии списком мест, как в лобби: человек и 1–3 ИИ.
 * Мест всегда четыре, поэтому высота блока не зависит от числа противников.
 * Сложность меняет только стартовые запасы ИИ — они видны в строке.
 */
export const AiSetupSection = () => {
  const aiSetups = useSettingsStore(state => state.aiSetups);
  const setAiCount = useSettingsStore(state => state.setAiCount);
  const setAiSetup = useSettingsStore(state => state.setAiSetup);
  const removeAi = useSettingsStore(state => state.removeAi);
  const choices = useSettingsStore(state => state.paletteChoices);
  const count = aiSetups.length;

  return (
    <section className={clsx(styles.Section, styles.SidesSection)}>
      <StepLabel step={3}>Стороны</StepLabel>
      <div className={styles.Roster}>
        <div className={styles.RosterHead} aria-hidden>
          <span>Сторона</span>
          <span>Цвет</span>
          <span>Характер</span>
          <span>Сложность</span>
          <span>Старт</span>
        </div>
        <div className={styles.SideRow} data-human>
          <SideBadge owner='p1' choice={choices.p1} name='Вы' />
          <PaletteSelect owner='p1' label='Ваш цвет' />
          <span className={styles.SideNote}>Ваша сторона</span>
          <Stock {...START_RESOURCES.p1} />
        </div>
        {PARTICIPANT_IDS.slice(1).map((owner, index) => {
          const aiSetup = aiSetups[index];
          if (!aiSetup)
            return index === count ? (
              <button
                key={owner}
                className={styles.AddSide}
                onClick={() => setAiCount(count + 1)}
              >
                + Добавить противника
              </button>
            ) : (
              <div key={owner} className={styles.EmptySide} aria-hidden />
            );
          const { stockBonus } = AI_DIFFICULTY[aiSetup.difficulty];
          const start = START_RESOURCES[owner];
          return (
            <div key={owner} className={styles.SideRow}>
              <SideBadge
                owner={owner}
                choice={choices[owner]}
                name={`ИИ ${index + 1}`}
              />
              <PaletteSelect
                owner={owner}
                label={`Цвет противника ${index + 1}`}
              />
              <Select
                name={`ai-profile-${owner}`}
                aria-label={`Характер противника ${index + 1}`}
                value={aiSetup.profile}
                options={PROFILE_OPTIONS}
                onChange={profile => setAiSetup(index, { profile })}
              />
              <Select
                name={`ai-difficulty-${owner}`}
                aria-label={`Сложность противника ${index + 1}`}
                value={aiSetup.difficulty}
                options={DIFFICULTY_OPTIONS}
                onChange={difficulty => setAiSetup(index, { difficulty })}
              />
              <Stock
                gold={Math.max(0, start.gold + stockBonus.gold)}
                wood={Math.max(0, start.wood + stockBonus.wood)}
              />
              <button
                className={styles.RemoveSide}
                aria-label={`Убрать противника ${index + 1}`}
                title='Убрать противника'
                disabled={count < 2}
                onClick={() => removeAi(index)}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
