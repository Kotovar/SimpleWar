import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ConfirmDialog } from './ConfirmDialog';

const meta = {
  title: 'Shared/ConfirmDialog',
  component: ConfirmDialog,
  args: {
    isOpen: true,
    message: 'Точно выполнить действие?',
    onConfirm: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Заголовок и кнопки по умолчанию. */
export const Default: Story = {};

/** Как диалог сброса игры в меню. */
export const ResetGame: Story = {
  args: {
    title: 'Сброс игры',
    message: 'Точно сбросить игру? Весь прогресс будет потерян.',
    confirmText: 'Да, сбросить',
    cancelText: 'Отмена',
  },
};

export const LongMessage: Story = {
  args: {
    message:
      'Очень длинное сообщение: проверяем, как диалог переносит текст и не ломает кнопки, если объяснение занимает несколько строк подряд и содержит длинныеслованесколькоразподряд.',
  },
};
