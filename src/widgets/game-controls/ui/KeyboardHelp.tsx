import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getHelpGroups } from '../lib/helpGroups';
import { useLayoutMap } from '../model/useLayoutMap';
import legend from './styles.module.css';
import styles from './KeyboardHelp.styles.module.css';

/** Справка по F1 и кнопке в шапке; нативный dialog удерживает фокус. */
export const KeyboardHelp = () => {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const layout = useLayoutMap();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'F1') {
        event.preventDefault();
        event.stopPropagation();
        if (event.repeat) return;
        // Не открываем второе модальное окно поверх подтверждения.
        if (!dialog.current?.open && document.querySelector('dialog[open]'))
          return;
        setOpen(value => !value);
      } else if (dialog.current?.open) {
        // Камера и команды карты не получают клавиши из справки.
        event.stopPropagation();
        if (event.code === 'Escape') {
          event.preventDefault();
          setOpen(false);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () =>
      window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const previousFocus = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [open]);

  return (
    <>
      <button
        type='button'
        className={styles.HelpButton}
        aria-label='Справка по клавишам'
        title='Справка по клавишам (F1)'
        onClick={() => setOpen(true)}
      >
        ?
      </button>
      {open &&
        createPortal(
          <dialog
            ref={dialog}
            className={styles.Dialog}
            aria-labelledby={titleId}
            onCancel={() => setOpen(false)}
            onClick={event => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <div
              className={styles.Content}
              onClick={event => event.stopPropagation()}
            >
              <header className={styles.Header}>
                <h2 id={titleId}>Справка по клавишам</h2>
                <button
                  type='button'
                  className={styles.HelpButton}
                  onClick={() => setOpen(false)}
                  aria-label='Закрыть справку'
                >
                  ×
                </button>
              </header>
              <p className={styles.Note}>
                F1 / Esc — закрыть. Клик мимо окна — закрыть. Буквы показаны в
                текущей раскладке, если браузер её сообщает.
              </p>
              <div className={styles.Groups}>
                {getHelpGroups(layout).map(group => (
                  <section key={group.title}>
                    <h3>{group.title}</h3>
                    <dl className={styles.Keys}>
                      {group.items.map(item => (
                        <div
                          key={item.keys}
                          title={'hint' in item ? item.hint : undefined}
                        >
                          <dt>
                            <kbd>{item.keys}</kbd>
                          </dt>
                          <dd>{item.label}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
                <section>
                  <h3>Подсветка на карте</h3>
                  <ul className={legend.Legend}>
                    <li>
                      <span className={legend.Swatch} aria-hidden />
                      Куда идти
                    </li>
                    <li>
                      <span
                        className={legend.Swatch}
                        data-kind='produce'
                        aria-hidden
                      />
                      Где строить
                    </li>
                    <li>
                      <span
                        className={legend.Swatch}
                        data-kind='attack'
                        aria-hidden
                      />
                      Кого атаковать
                    </li>
                  </ul>
                </section>
              </div>
            </div>
          </dialog>,
          document.body,
        )}
    </>
  );
};
