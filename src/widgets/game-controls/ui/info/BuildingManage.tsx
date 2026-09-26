import { useState } from 'react';
import { BUILDINGS_NAME, type Building } from '@shared/config';
import { ConfirmDialog } from '@shared/ui';
import { useUnitsStore } from '@entities/units';
import { useSelectionStore } from '@features/selection';
import { useHighlightStore, useMovementStore } from '@features/pathfinding';
import { demolish } from '@features/build';
import styles from './OptionCards.styles.module.css';

/**
 * Управление своим зданием: кто на нём работает и снос. Снос ратуши
 * запрещён; остальное сносится без возврата ресурсов после подтверждения.
 */
export const BuildingManage = ({ building }: { building: Building }) => {
  const [confirm, setConfirm] = useState(false);
  const worker = useUnitsStore(state =>
    Object.values(state.units).find(
      unit => unit.role === 'civil' && unit.workplaceId === building.id,
    ),
  );
  const isResource = building.role === 'resource';
  const canDemolish = building.type !== 'base';
  if (!isResource && !canDemolish) return null;

  const onDemolish = () => {
    setConfirm(false);
    const result = demolish({ actor: building.owner, buildingId: building.id });
    if (!result.ok) return;
    useSelectionStore.getState().clearSelection();
    useMovementStore.getState().resetStore();
    useHighlightStore.getState().resetStore();
  };

  return (
    <section className={styles.Section}>
      {isResource && (
        <header className={styles.Header}>
          <h4 className={styles.Title}>Добыча</h4>
          <span className={styles.Points} data-empty={!worker}>
            {worker ? 'Рабочий на месте' : 'Нет рабочего'}
          </span>
        </header>
      )}
      {isResource && !worker && (
        <p className={styles.Prompt}>
          Без рабочего здание ничего не приносит. Поставьте рабочего рядом и
          назначьте его в панели рабочего.
        </p>
      )}

      {canDemolish && (
        <div className={styles.List}>
          <button
            type='button'
            className={styles.Card}
            onClick={() => setConfirm(true)}
          >
            <span className={styles.Content}>
              <span className={styles.Name}>Снести здание</span>
              <span className={styles.Info}>
                Освобождает клетку; ресурсы не возвращаются.
              </span>
            </span>
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirm}
        title='Снос здания'
        message={`Снести «${BUILDINGS_NAME[building.type]}»? Ресурсы не вернутся.`}
        confirmText='Снести'
        cancelText='Отмена'
        onConfirm={onDemolish}
        onCancel={() => setConfirm(false)}
      />
    </section>
  );
};
