import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
import styles from './styles.module.css';

type Props = {
  isOpen: boolean;
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmDialog = ({
  isOpen,
  message,
  title = 'Подтверждение',
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  onConfirm,
  onCancel,
}: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }

    return () => {
      if (dialog.open) dialog.close();
    };
  }, [isOpen]);

  const handleBackdropClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className={styles.Dialog}
      onClose={onCancel}
      onClick={handleBackdropClick}
    >
      <div className={styles.Content} onClick={e => e.stopPropagation()}>
        <h3 className={styles.Title}>{title}</h3>
        <p className={styles.Message}>{message}</p>
        <div className={styles.Buttons}>
          <button className={styles.ConfirmButton} onClick={onConfirm}>
            {confirmText}
          </button>
          <button className={styles.CancelButton} onClick={onCancel} autoFocus>
            {cancelText}
          </button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
};
