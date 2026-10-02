import clsx from 'clsx';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';
import styles from './Form.module.css';

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  /** Частично отмечено: например, исключение включено не у всех. */
  indeterminate?: boolean;
  disabled?: boolean;
  className?: string;
};

/** Флажок с подписью в стиле игры; клавиатура и фокус — от `<input>`. */
export const Checkbox = ({
  checked,
  onChange,
  children,
  indeterminate = false,
  disabled,
  className,
}: CheckboxProps) => (
  <label className={clsx(styles.Check, className)} data-disabled={disabled}>
    <input
      type='checkbox'
      className={styles.Box}
      checked={checked}
      disabled={disabled}
      ref={input => {
        if (input) input.indeterminate = indeterminate;
      }}
      onChange={event => onChange(event.target.checked)}
    />
    {children}
  </label>
);

type SelectProps<T extends string> = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'value' | 'onChange'
> & {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
};

/**
 * Выпадающий список в стиле игры. Список вариантов — системный: так он
 * остаётся доступным с клавиатуры и на сенсорных экранах.
 */
export const Select = <T extends string>({
  value,
  options,
  onChange,
  className,
  ...rest
}: SelectProps<T>) => (
  <select
    {...rest}
    className={clsx(styles.Select, className)}
    value={value}
    onChange={event => onChange(event.target.value as T)}
  >
    {options.map(option => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

type SliderProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange'
> & {
  value: number;
  onChange: (value: number) => void;
};

/** Доля дорожки до значения, 0–100; пустой диапазон — 0. */
const fillPercent = (value: number, min: number, max: number) =>
  max > min
    ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
    : 0;

/** Ползунок в стиле игры; заполненная часть дорожки показывает значение. */
export const Slider = ({
  value,
  onChange,
  min = 0,
  max = 100,
  className,
  style,
  ...rest
}: SliderProps) => (
  <input
    {...rest}
    type='range'
    min={min}
    max={max}
    value={value}
    className={clsx(styles.Slider, className)}
    style={{
      ...style,
      ['--fill' as string]: `${fillPercent(value, Number(min), Number(max))}%`,
    }}
    onChange={event => onChange(Number(event.target.value))}
  />
);

/** Текстовое поле в стиле игры: все свойства уходят в `<input>`. */
export const TextField = ({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...rest} className={clsx(styles.Field, className)} />
);

type NumberFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange' | 'min' | 'max'
> & {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
};

/**
 * Целое неотрицательное число с кнопками «−»/«+» вместо системных стрелок;
 * стрелки клавиатуры тоже меняют значение. Ввод ограничивается
 * `min`…`max` (`min` ≥ 0: минус не вводится); пустое поле — `min`.
 */
export const NumberField = ({
  value,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  onChange,
  className,
  disabled,
  'aria-label': label,
  ...rest
}: NumberFieldProps) => {
  const set = (next: number) =>
    onChange(
      Number.isNaN(next) ? min : Math.min(max, Math.max(min, Math.trunc(next))),
    );
  return (
    <span className={clsx(styles.Number, className)}>
      <button
        type='button'
        tabIndex={-1}
        aria-label={label ? `${label}: меньше` : 'Меньше'}
        disabled={disabled || value <= min}
        onClick={() => set(value - 1)}
      >
        −
      </button>
      <input
        {...rest}
        aria-label={label}
        disabled={disabled}
        className={styles.Field}
        inputMode='numeric'
        value={value}
        onChange={event => set(Number(event.target.value.replace(/\D/g, '')))}
        onKeyDown={event => {
          // Стрелки — как у системного числового поля.
          if (event.key === 'ArrowUp') set(value + 1);
          else if (event.key === 'ArrowDown') set(value - 1);
          else return;
          event.preventDefault();
        }}
      />
      <button
        type='button'
        tabIndex={-1}
        aria-label={label ? `${label}: больше` : 'Больше'}
        disabled={disabled || value >= max}
        onClick={() => set(value + 1)}
      >
        +
      </button>
    </span>
  );
};
