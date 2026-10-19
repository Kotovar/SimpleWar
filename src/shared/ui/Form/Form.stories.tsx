import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox, NumberField, Select, Slider, TextField } from './Form';

const PROFILES = [
  { value: 'balanced', label: 'Сбалансированный' },
  { value: 'conqueror', label: 'Завоеватель' },
  { value: 'builder', label: 'Строитель' },
] as const;

type Profile = (typeof PROFILES)[number]['value'];

/** Все элементы рядом: как они выглядят вместе в панели отладки и меню. */
const Gallery = ({ disabled }: { disabled: boolean }) => {
  const [checked, setChecked] = useState(true);
  const [partial, setPartial] = useState(false);
  const [profile, setProfile] = useState<Profile>('balanced');
  const [volume, setVolume] = useState(0.6);
  const [count, setCount] = useState(2);
  const [seed, setSeed] = useState('12354');

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 360 }}>
      <Checkbox checked={checked} disabled={disabled} onChange={setChecked}>
        Звук включён
      </Checkbox>
      <Checkbox
        checked={partial}
        indeterminate={!partial}
        disabled={disabled}
        onChange={setPartial}
      >
        Частично (у части участников)
      </Checkbox>
      <Select
        aria-label='Профиль ИИ'
        value={profile}
        options={PROFILES}
        disabled={disabled}
        onChange={setProfile}
      />
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        Музыка
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={volume}
          disabled={disabled}
          onChange={setVolume}
          style={{ flex: 1 }}
        />
      </label>
      <NumberField
        aria-label='Лучники'
        value={count}
        max={9}
        disabled={disabled}
        onChange={setCount}
      />
      <TextField
        aria-label='Сид'
        inputMode='numeric'
        value={seed}
        disabled={disabled}
        aria-invalid={!/^\d+$/.test(seed)}
        onChange={event => setSeed(event.target.value)}
      />
    </div>
  );
};

const meta = {
  title: 'Shared/Form',
  component: Gallery,
  args: { disabled: false },
} satisfies Meta<typeof Gallery>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = { args: { disabled: true } };
