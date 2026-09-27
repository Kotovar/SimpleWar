import type { BuildingType, UnitType } from '@shared/config';
import { getCombatProfile } from '@shared/lib';
import {
  ArmorIcon,
  CategoryIcon,
  FlyingIcon,
  HitsAirIcon,
  HitsGroundAirIcon,
  IconHint,
  MagicDamageIcon,
  MagicResistIcon,
} from '@shared/ui';
import styles from './CombatBadges.styles.module.css';

type Props = { type: UnitType | BuildingType };

/**
 * Значки рядом с уроном: тип урона, доступ к воздуху и бонусы против
 * категорий в скобках — «(+6 крыло)». Подробности — во всплывающей подсказке.
 */
export const DamageBadges = ({ type }: Props) => {
  const { damageType, hitsAir, flies, bonuses } = getCombatProfile(type);
  return (
    <span className={styles.Badges}>
      {damageType === 'magic' && (
        <IconHint label='Магический урон: броня не защищает, только магическая защита'>
          <MagicDamageIcon />
        </IconHint>
      )}
      {hitsAir && !flies && (
        <IconHint label='Бьёт воздушные цели'>
          <HitsAirIcon />
        </IconHint>
      )}
      {flies && (
        <IconHint label='Бьёт и наземные, и воздушные цели'>
          <HitsGroundAirIcon />
        </IconHint>
      )}
      {bonuses.length > 0 && (
        <span className={styles.Bonus}>
          (
          {bonuses.map(({ category, value }, index) => (
            <span key={category}>
              {index > 0 && ' / '}+{value} <CategoryIcon category={category} />
            </span>
          ))}
          )
        </span>
      )}
    </span>
  );
};

/** Защита значками: броня от физического урона, щит со звездой — от магии. */
export const DefenseBadges = ({ type }: Props) => {
  const { armor, magicResist } = getCombatProfile(type);
  return (
    <span className={styles.Badges}>
      {armor > 0 && (
        <IconHint label={`Броня ${armor}: снижает физический урон`}>
          {armor} <ArmorIcon />
        </IconHint>
      )}
      {magicResist > 0 && (
        <IconHint
          label={`Магическая защита ${magicResist}: снижает магический урон`}
        >
          {magicResist} <MagicResistIcon />
        </IconHint>
      )}
    </span>
  );
};

/** Значок полёта рядом с движением. */
export const FlightBadge = ({ type }: Props) =>
  getCombatProfile(type).flies ? (
    <IconHint label='Летает: над водой, горами, лесом и занятыми клетками'>
      <FlyingIcon />
    </IconHint>
  ) : null;
