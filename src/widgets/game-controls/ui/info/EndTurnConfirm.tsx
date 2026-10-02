import { pluralRu } from '@shared/lib';
import { Checkbox, ConfirmDialog } from '@shared/ui';
import { usePreferencesStore } from '@entities/settings';
import styles from './EndTurnConfirm.styles.module.css';

type Props = {
  /** Сколько своих юнитов ещё могут действовать; 0 — окно закрыто. */
  pending: number;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Спрашивает перед концом хода, если свои юниты ещё могут действовать.
 * Галочка «Больше не спрашивать» сохраняется в браузере.
 */
export const EndTurnConfirm = ({ pending, onConfirm, onCancel }: Props) => {
  const confirm = usePreferencesStore(state => state.confirmEndTurn);
  const setConfirm = usePreferencesStore(state => state.setConfirmEndTurn);

  return (
    <ConfirmDialog
      isOpen={pending > 0}
      title='Завершить ход?'
      message={`${pending} ${pluralRu(pending, ['юнит', 'юнита', 'юнитов'])} ещё ${pending === 1 ? 'может' : 'могут'} идти, атаковать или лечить.`}
      confirmText='Завершить ход'
      cancelText='Вернуться'
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <Checkbox
        className={styles.Ask}
        checked={!confirm}
        onChange={checked => setConfirm(!checked)}
      >
        Больше не спрашивать
      </Checkbox>
    </ConfirmDialog>
  );
};
