import styles from './styles.module.css';

/** Заголовок шага главного меню: номер и название. */
export const StepLabel = ({
  step,
  children,
}: {
  step: number;
  children: string;
}) => (
  <div className={styles.Label}>
    <span className={styles.Step}>{step}</span>
    {children}
  </div>
);
