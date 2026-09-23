import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  BUILDINGS_NAME,
  OWNER_NAME,
  TEAM_MARKERS,
  UNITS_NAME,
  type BuildingType,
  type Owner,
  type UnitType,
} from '@shared/config';
import { EntityPortrait } from './EntityPortrait';

const owners = Object.keys(TEAM_MARKERS) as Owner[];

const cell = { padding: 8, textAlign: 'center' } as const;

type Props = {
  names: Partial<Record<UnitType | BuildingType, string>>;
  size: number;
};

/** Строки — сущности, колонки — стороны: новые типы и цвета появятся сами. */
const EntitiesGrid = ({ names, size }: Props) => (
  <table style={{ borderCollapse: 'collapse' }}>
    <thead>
      <tr>
        <th />
        {owners.map(owner => (
          <th key={owner} style={cell}>
            {OWNER_NAME[owner]}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {(Object.keys(names) as (UnitType | BuildingType)[]).map(type => (
        <tr key={type}>
          <th style={cell}>{names[type]}</th>
          {owners.map(owner => (
            <td key={owner} style={cell}>
              <EntityPortrait type={type} owner={owner} size={size} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

const meta = {
  title: 'Entities',
  component: EntitiesGrid,
  args: { names: UNITS_NAME, size: 64 },
  argTypes: {
    names: { control: false },
    size: { control: { type: 'range', min: 16, max: 256 } },
  },
} satisfies Meta<typeof EntitiesGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Units: Story = { args: { names: UNITS_NAME } };

export const Buildings: Story = { args: { names: BUILDINGS_NAME } };
