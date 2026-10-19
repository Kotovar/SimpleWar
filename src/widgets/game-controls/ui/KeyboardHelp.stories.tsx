import type { Meta, StoryObj } from '@storybook/react-vite';
import { KeyboardHelp } from './KeyboardHelp';

const meta = {
  title: 'Interface/KeyboardHelp',
  component: KeyboardHelp,
} satisfies Meta<typeof KeyboardHelp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  name: 'Справка по клавишам',
  play: () => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'F1', cancelable: true }),
    );
  },
};
