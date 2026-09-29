import { useSandboxStore } from '@features/sandbox';
import { downloadReport } from './download';
import styles from './Sandbox.styles.module.css';

/** Управление боем режима тестирования: пауза, ускорение, выгрузка итога. */
export const SandboxControls = () => {
  const { enabled, paused, fast, skipped, setPaused, setFast } =
    useSandboxStore();
  if (!enabled) return null;

  return (
    <section className={styles.Controls} aria-label='Режим тестирования'>
      <h4 className={styles.Title}>Тестирование баланса</h4>
      <div className={styles.Buttons}>
        <button type='button' onClick={() => setPaused(!paused)}>
          {paused ? 'Продолжить' : 'Пауза'}
        </button>
        <button
          type='button'
          aria-pressed={fast}
          onClick={() => setFast(!fast)}
        >
          {fast ? 'Обычная скорость' : 'Быстро'}
        </button>
        <button type='button' onClick={downloadReport}>
          Итог в JSON
        </button>
      </div>
      {skipped.length > 0 && (
        <p className={styles.Hint}>
          Не поместилось у баз: {skipped.join(', ')}.
        </p>
      )}
    </section>
  );
};
