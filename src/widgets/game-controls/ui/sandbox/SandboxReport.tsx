import { BUILDINGS_NAME, OWNER_NAME, UNITS_NAME } from '@shared/config';
import { GoldIcon, WoodIcon } from '@shared/ui';
import {
  collectReport,
  useSandboxStore,
  type TypeTally,
} from '@features/sandbox';
import { downloadReport } from './download';
import styles from './Sandbox.styles.module.css';

const NAMES: Record<string, string> = { ...UNITS_NAME, ...BUILDINGS_NAME };
const total = (tally: TypeTally) =>
  Math.round(Object.values(tally).reduce((sum, value) => sum + value, 0));

/** Итог боя режима тестирования на экране конца партии. */
export const SandboxReport = () => {
  const enabled = useSandboxStore(state => state.enabled);
  if (!enabled) return null;
  const report = collectReport();

  return (
    <section className={styles.Report} aria-label='Итог боя'>
      <div className={styles.ReportMeta}>
        <span>
          Карта{' '}
          <strong>
            {report.size.cols} × {report.size.rows}
          </strong>
        </span>
        <span>
          Сид <strong>{report.seed ?? '—'}</strong>
        </span>
      </div>
      <p className={styles.Winner}>
        {report.winner
          ? `Победитель — ${OWNER_NAME[report.winner]}`
          : 'Ничья — победителя нет'}
      </p>
      <div className={styles.SideReports}>
        {report.sides.map(side => (
          <article
            className={styles.SideReport}
            key={side.id}
            data-owner={side.id}
          >
            <header className={styles.SideHeading}>
              <h3>{OWNER_NAME[side.id]}</h3>
              <span>
                {side.id === report.winner
                  ? 'Победа'
                  : side.eliminated
                    ? 'Выбыли'
                    : 'В игре'}
              </span>
            </header>
            <dl className={styles.Summary}>
              <div>
                <dt>Осталось объектов</dt>
                <dd>{total(side.alive)}</dd>
              </div>
              <div>
                <dt>Потеряно объектов</dt>
                <dd>{total(side.losses)}</dd>
              </div>
              <div>
                <dt>Получено урона</dt>
                <dd>{total(side.damage)}</dd>
              </div>
            </dl>
            <div className={styles.Stock}>
              <span>
                <GoldIcon /> {side.stock.gold} золота
              </span>
              <span>
                <WoodIcon /> {side.stock.wood} дерева
              </span>
            </div>
            <details className={styles.Breakdown}>
              <summary>Подробности по типам</summary>
              <table>
                <caption className={styles.Hint}>
                  Юниты и здания · урон полученный
                </caption>
                <thead>
                  <tr>
                    <th scope='col'>Тип</th>
                    <th scope='col'>Живы</th>
                    <th scope='col'>Потери</th>
                    <th scope='col'>Урон</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ...new Set([
                      ...Object.keys(side.alive),
                      ...Object.keys(side.losses),
                      ...Object.keys(side.damage),
                    ]),
                  ].map(type => (
                    <tr key={type}>
                      <th scope='row'>{NAMES[type] ?? type}</th>
                      <td>{side.alive[type] ?? 0}</td>
                      <td>{side.losses[type] ?? 0}</td>
                      <td>{Math.round(side.damage[type] ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </article>
        ))}
      </div>
      <button
        type='button'
        className={styles.Secondary}
        onClick={downloadReport}
      >
        Скачать итог в JSON
      </button>
    </section>
  );
};
