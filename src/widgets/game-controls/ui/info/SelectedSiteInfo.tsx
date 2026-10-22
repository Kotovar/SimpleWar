import { SITES_NAME, type SiteType } from '@shared/config';
import { SitePortrait } from '@shared/ui';
import type { KnownSite } from '@entities/perceptions';
import styles from './SelectedEntityInfo.styles.module.css';

const HINT: Record<SiteType, string> = {
  cache: 'Откроет разведчик. Содержимое тайника скрыто.',
  refugees: 'Поможет разведчик. Для нового рабочего нужно свободное население.',
  obelisk: 'Активирует разведчик. Открывает местность вокруг.',
  ruins: 'Займёт боец. Здесь можно основать аванпост.',
  camp: 'Для найма нужен свой разведчик рядом.',
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
