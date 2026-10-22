import {
  OBELISK_REVEAL_RADIUS,
  SITES_NAME,
  type SiteType,
} from '@shared/config';
import { SitePortrait } from '@shared/ui';
import type { KnownSite } from '@entities/perceptions';
import styles from './SelectedEntityInfo.styles.module.css';

const HINT: Record<SiteType, string> = {
  cache: 'Откроет разведчик при входе в клетку. Содержимое тайника скрыто.',
  refugees:
    'Разведчик поможет при входе в клетку. Нужны свободное население и место для рабочего рядом.',
  obelisk: `Разведчик активирует при входе в клетку. Запоминает местность в радиусе ${OBELISK_REVEAL_RADIUS}, без текущего обзора.`,
  ruins:
    'Займите соседним военным юнитом: «Занять руины» (O). Тратит боевое действие; аванпост даст обзор 4, +5 золота за ход и +2 населения.',
  camp: 'Мечник или лучник: +30% золота, без дерева. Нужен свой разведчик на соседней клетке. Запас наймов общий для всех.',
};

export const SelectedSiteInfo = ({
  site,
  remembered,
}: {
  site: KnownSite;
  remembered: boolean;
}) => (
  <section className={styles.EntityInfo}>
    <div className={styles.EntityHeader}>
      <SitePortrait type={site.type} size={56} />
      <div>
        <h3 className={styles.EntityName}>{SITES_NAME[site.type]}</h3>
        <span className={styles.Owner}>
          {remembered ? 'По последнему обзору' : 'Нейтральная находка'}
        </span>
      </div>
    </div>
    <p className={styles.Owner}>{HINT[site.type]}</p>
    <dl className={styles.EntityDetails}>
      <div>
        <dt>Координаты</dt>
        <dd>
          ({site.x}, {site.y})
        </dd>
      </div>
      {site.type === 'camp' && (
        <div>
          <dt>Осталось наймов</dt>
          <dd>{site.hiresLeft}</dd>
        </div>
      )}
    </dl>
  </section>
);
