import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import styles from './styles.module.css';

type Props = {
  isOpen: boolean;
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Дополнительное содержимое под сообщением, например галочка. */
  children?: ReactNode;
  /**
   * Кнопка в фокусе при открытии — её нажимает `Enter`. По умолчанию
   * отмена: необратимое действие не выполняется случайно.
   */
  focus?: 'confirm' | 'cancel';
};

export const ConfirmDialog = ({
  isOpen,
  message,
  title = 'Подтверждение',
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  onConfirm,
  onCancel,
  children,
  focus = 'cancel',
}: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
      (focus === 'confirm' ? confirmRef : cancelRef).current?.focus();
    } else {
      dialog.close();
    }

    // Закрываем dialog перед повторным эффектом и при размонтировании.
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [isOpen, focus]);

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
        {children}
        <div className={styles.Buttons}>
          <button
            ref={confirmRef}
            className={styles.ConfirmButton}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
          <button
            ref={cancelRef}
            className={styles.CancelButton}
            onClick={onCancel}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
};
