import type { Owner } from '@shared/config';
import { EntityPortrait, GoldIcon, PopulationIcon, WoodIcon } from '@shared/ui';
import type { ActionButton } from '../lib/selectionActions';
import { ActionIcon } from './ActionIcon';
import styles from './ActionBar.styles.module.css';

/** Кнопка панели: портрет или значок, название, цена, клавиша и знак недоступности. */
export const ActionCard = ({
  button,
  owner,
  keyLabel,
  onPress,
}: {
  button: ActionButton;
  owner: Owner;
  keyLabel?: string;
  onPress: () => void;
}) => (
  <button
    type='button'
    className={styles.Card}
    aria-label={button.label}
    aria-description={[
      button.hint,
      button.reason,
      button.cost &&
        `Цена: ${button.cost.gold} золота, ${button.cost.wood} древесины${button.cost.population ? `, ${button.cost.population} населения` : ''}`,
    ]
      .filter(Boolean)
      .join('. ')}
    aria-pressed={button.pressed ?? false}
    aria-disabled={!!button.reason}
    data-unavailable={!!button.reason}
    data-portrait={!!button.portrait}
    title={[button.hint, button.reason].filter(Boolean).join('\n')}
    onClick={onPress}
  >
    {button.portrait ? (
      <EntityPortrait type={button.portrait} owner={owner} size={34} />
    ) : (
      <span className={styles.Icon}>
        <ActionIcon id={button.id} />
      </span>
    )}
    <span className={styles.Label}>{button.label}</span>
    {button.cost && (
      <span className={styles.Cost}>
        {button.cost.gold > 0 && (
          <span>
            <GoldIcon size={9} /> {button.cost.gold}
          </span>
        )}
        {button.cost.wood > 0 && (
          <span>
            <WoodIcon size={9} /> {button.cost.wood}
          </span>
        )}
        {!!button.cost.population && (
          <span>
            <PopulationIcon size={9} /> {button.cost.population}
          </span>
        )}
      </span>
    )}
    {keyLabel && <kbd className={styles.Key}>{keyLabel}</kbd>}
    {button.reason && (
      <span className={styles.Reason} aria-hidden>
        !
      </span>
    )}
  </button>
);
