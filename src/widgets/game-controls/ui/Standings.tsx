import { getParticipantName, type ParticipantId } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useJournalStore } from '@entities/journals';
import { useGameLoopSelectors } from '@features/game-loop';
import { getStandings } from '../lib/gameResult';
import { SideMark } from './info/SideMark';
import styles from './PhaseGameOver.styles.module.css';

/**
 * Места всех сторон: победитель, оставшиеся в игре, выбывшие с ходом
 * выбывания. Партия окончена — показ чужих сил скрытого не раскрывает.
 */
export const Standings = () => {
  const { participants, eliminated, winner, humanId } = useGameLoopSelectors();
  const units = Object.values(useUnitsStore(state => state.units));
  const buildings = Object.values(useBuildingsStore(state => state.buildings));
  const entries = useJournalStore(state => state.entries);
  const count = (list: { owner: ParticipantId }[], id: ParticipantId) =>
    list.filter(({ owner }) => owner === id).length;
  const outTurn = (id: ParticipantId) =>
    entries.find(
      entry => entry.type === 'eliminated' && entry.details?.participant === id,
    )?.turn;
  const rows = getStandings(
    participants,
    eliminated,
    winner,
    id => count(units, id) + count(buildings, id),
  );

  return (
    <section className={styles.Result} aria-label='Места сторон'>
      <h3>Места сторон</h3>
      <table className={styles.Standings}>
        <thead>
          <tr>
            <th>Место</th>
            <th>Сторона</th>
            <th>Итог</th>
            <th>Юниты</th>
            <th>Здания</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ id, place, out }) => {
            const turn = outTurn(id);
            return (
              <tr key={id} data-own={id === humanId || undefined}>
                <td>{place}</td>
                <td>
                  <span className={styles.Side}>
                    <SideMark owner={id} participants={participants} />
                    {getParticipantName(id, participants)}
                    {id === humanId && ' (вы)'}
                  </span>
                </td>
                <td>
                  {id === winner
                    ? 'Победа'
                    : out
                      ? `Выбыли${turn ? ` на ходу ${turn}` : ''}`
                      : 'В игре'}
                </td>
                <td>{count(units, id)}</td>
                <td>{count(buildings, id)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
};
