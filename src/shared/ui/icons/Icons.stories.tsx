import type { Meta, StoryObj } from '@storybook/react-vite';
import { GoldIcon, PopulationIcon, TerrainIcon, WoodIcon } from './index';

const ICONS = {
  Золото: GoldIcon,
  Древесина: WoodIcon,
  Население: PopulationIcon,
  Местность: TerrainIcon,
};

const SIZES = [14, 16, 24, 32, 48];

const cell = { padding: 8, textAlign: 'center' } as const;

const IconsGrid = () => (
  <table style={{ borderCollapse: 'collapse' }}>
    <thead>
      <tr>
        <th />
        {SIZES.map(size => (
          <th key={size} style={cell}>
            {size}px
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {Object.entries(ICONS).map(([name, Icon]) => (
        <tr key={name}>
          <th style={cell}>{name}</th>
          {SIZES.map(size => (
            <td key={size} style={cell}>
              <Icon size={size} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

const meta = {
  title: 'Shared/Icons',
  component: IconsGrid,
} satisfies Meta<typeof IconsGrid>;

export default meta;

export const AllIcons: StoryObj<typeof meta> = {};
