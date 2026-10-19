import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  BUILDINGS_NAME,
  PALETTES,
  PALETTE_IDS,
  PARTICIPANT_IDS,
  type PaletteId,
  UNITS_NAME,
  type BuildingType,
  type Owner,
  type UnitType,
} from '@shared/config';
import { EntityPortrait } from './EntityPortrait';

const cell = { padding: 8, textAlign: 'center' } as const;

type Props = {
  names: Partial<Record<UnitType | BuildingType, string>>;
  size: number;
  owner: Owner;
  palette: PaletteId | 'all';
};

/** Строки — сущности, колонки — стороны: восемь палитр и маркер выбранного слота. */
const EntitiesGrid = ({ names, size, owner, palette }: Props) => {
  const palettes = palette === 'all' ? PALETTE_IDS : [palette];
  const paletteWidth = Math.max(128, size + 16);
  return (
    <div style={{ maxWidth: '100%', overflowX: 'auto' }}>
      <table
        style={{
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          width: 200 + palettes.length * paletteWidth,
        }}
      >
        <colgroup>
          <col style={{ width: 200 }} />
          {palettes.map(palette => (
            <col key={palette} style={{ width: paletteWidth }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th />
            {palettes.map(palette => (
              <th key={palette} style={cell}>
                {PALETTES[palette].name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(Object.keys(names) as (UnitType | BuildingType)[]).map(type => (
            <tr key={type}>
              <th style={cell}>{names[type]}</th>
              {palettes.map(palette => (
                <td key={palette} style={cell}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <EntityPortrait
                      type={type}
                      owner={owner}
                      palette={palette}
                      size={size}
                    />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const meta = {
  title: 'Entities',
  component: EntitiesGrid,
  args: { names: UNITS_NAME, size: 64, owner: 'p1', palette: 'all' },
  argTypes: {
    names: { control: false },
    owner: { control: 'select', options: PARTICIPANT_IDS },
    palette: { control: 'select', options: ['all', ...PALETTE_IDS] },
    size: { control: { type: 'range', min: 16, max: 256 } },
  },
} satisfies Meta<typeof EntitiesGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Units: Story = { args: { names: UNITS_NAME } };

export const Buildings: Story = { args: { names: BUILDINGS_NAME } };
