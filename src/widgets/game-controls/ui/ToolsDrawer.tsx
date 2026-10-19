import { useDebugStore } from '@entities/settings';
import { useSandboxStore } from '@features/sandbox';
import { DebugPanel } from './info';
import { SandboxControls } from './sandbox';
import styles from './Overlays.styles.module.css';

/** Инструменты нужны только в режиме отладки или тестирования баланса. */
const useToolsAvailable = () => {
  const debug = useDebugStore(state => state.enabled);
  const sandbox = useSandboxStore(state => state.enabled);
  return debug || sandbox;
};

type Props = { open: boolean; onToggle: () => void };

/** Кнопка инструментов в шапке; без отладки и теста баланса скрыта. */
export const ToolsToggle = ({ open, onToggle }: Props) =>
  useToolsAvailable() ? (
    <button
      type='button'
      className={styles.ToolsToggle}
      aria-expanded={open}
      aria-controls='tools-drawer'
      onClick={onToggle}
    >
      Инструменты
    </button>
  ) : null;

/**
 * Отладка и управление тестом баланса: выдвижная панель справа поверх
 * карты, под шапкой при любой её высоте.
 */
export const ToolsDrawer = ({ open, onToggle }: Props) => {
  const available = useToolsAvailable();
  if (!open || !available) return null;
  return (
    <aside id='tools-drawer' className={styles.Drawer} aria-label='Инструменты'>
      <h2 className={styles.DrawerTitle}>Инструменты партии</h2>
      <button
        type='button'
        className={styles.DrawerClose}
        aria-label='Закрыть'
        onClick={onToggle}
      >
        ×
      </button>
      <SandboxControls />
      <DebugPanel />
    </aside>
  );
};
