import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  OWNER_NAME,
  TEAM_MARKERS,
  UNITS_NAME,
  type Owner,
  type UnitType,
} from '@shared/config';
import { EntityPortrait } from './EntityPortrait';

const units = Object.keys(UNITS_NAME) as UnitType[];
const owners = Object.keys(TEAM_MARKERS) as Owner[];

const cell = { padding: 8, textAlign: 'center' } as const;

const UnitsGrid = ({ size }: { size: number }) => (
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
      {units.map(unit => (
        <tr key={unit}>
          <th style={cell}>{UNITS_NAME[unit]}</th>
          {owners.map(owner => (
            <td key={owner} style={cell}>
              <EntityPortrait type={unit} owner={owner} size={size} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

const meta = {
  title: 'Entities/Units',
  component: UnitsGrid,
  args: { size: 64 },
  argTypes: { size: { control: { type: 'range', min: 16, max: 256 } } },
} satisfies Meta<typeof UnitsGrid>;

export default meta;

export const AllUnits: StoryObj<typeof meta> = {};
