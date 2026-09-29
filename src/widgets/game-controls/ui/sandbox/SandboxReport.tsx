import { BUILDINGS_NAME, OWNER_NAME, UNITS_NAME } from '@shared/config';
import {
  collectReport,
  useSandboxStore,
  type TypeTally,
} from '@features/sandbox';
import { downloadReport } from './download';
import styles from './Sandbox.styles.module.css';

const NAMES: Record<string, string> = { ...UNITS_NAME, ...BUILDINGS_NAME };

const list = (tally: TypeTally) =>
  Object.entries(tally)
    .map(([type, value]) => `${NAMES[type] ?? type} ${Math.round(value)}`)
    .join(', ') || '—';

/** Итог боя режима тестирования на экране конца партии. */
export const SandboxReport = () => {
  const enabled = useSandboxStore(state => state.enabled);
  if (!enabled) return null;
  const report = collectReport();

  return (
    <section className={styles.Report} aria-label='Итог боя'>
      <p className={styles.Hint}>
        Карта {report.size.cols} × {report.size.rows}, сид {report.seed ?? '—'},
        ходов {report.turns}. Победитель:{' '}
        {report.winner ? OWNER_NAME[report.winner] : 'нет'}.
      </p>
      <table className={styles.Table}>
        <thead>
          <tr>
            <th />
            <th>Осталось</th>
            <th>Потери</th>
            <th>Получено урона</th>
            <th>Запасы</th>
          </tr>
        </thead>
        <tbody>
          {report.sides.map(side => (
            <tr key={side.id}>
              <th scope='row' data-owner={side.id}>
                {OWNER_NAME[side.id]}
              </th>
              <td>{list(side.alive)}</td>
              <td>{list(side.losses)}</td>
              <td>{list(side.damage)}</td>
              <td>
                {side.stock.gold} / {side.stock.wood}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type='button'
        className={styles.Secondary}
        onClick={downloadReport}
      >
        Итог в JSON
      </button>
    </section>
  );
};
