import { useState } from 'react';
import {
  BUILDINGS_NAME,
  OWNER_NAME,
  PARTICIPANT_IDS,
  SANDBOX_LIMITS,
  UNITS_NAME,
  type SandboxBuildingType,
  type SandboxScenario,
  type SandboxSide,
  type UnitType,
} from '@shared/config';
import { Checkbox, NumberField } from '@shared/ui';
import { useSandboxStore } from '@features/sandbox';
import { SideControls } from './SideControls';
import styles from './Sandbox.styles.module.css';

const UNIT_TYPES = Object.keys(UNITS_NAME) as UnitType[];
const BUILDING_TYPES = (
  Object.keys(BUILDINGS_NAME) as SandboxBuildingType[]
).filter(type => (type as string) !== 'base');

type Row = {
  category: string;
  key: string;
  label: string;
  max: number;
  get: (side: SandboxSide) => number;
  set: (side: SandboxSide, value: number) => SandboxSide;
};

const ROWS: Row[] = [
  ...UNIT_TYPES.map(type => ({
    category: 'Юниты',
    key: type,
    label: UNITS_NAME[type],
    max: SANDBOX_LIMITS.unitsPerType,
    get: (side: SandboxSide) => side.units[type] ?? 0,
    set: (side: SandboxSide, value: number) => ({
      ...side,
      units: { ...side.units, [type]: value },
    }),
  })),
  ...BUILDING_TYPES.map(type => ({
    category: 'Здания',
    key: type,
    label: BUILDINGS_NAME[type],
    max: SANDBOX_LIMITS.buildingsPerType,
    get: (side: SandboxSide) => side.buildings[type] ?? 0,
    set: (side: SandboxSide, value: number) => ({
      ...side,
      buildings: { ...side.buildings, [type]: value },
    }),
  })),
  ...(['gold', 'wood'] as const).map(key => ({
    category: 'Ресурсы',
    key,
    label: key === 'gold' ? 'Золото' : 'Древесина',
    max: SANDBOX_LIMITS.stock,
    get: (side: SandboxSide) => side.stock[key],
    set: (side: SandboxSide, value: number) => ({
      ...side,
      stock: { ...side.stock, [key]: value },
    }),
  })),
];

/**
 * Настройка сценария режима тестирования: управление и состав каждой
 * стороны числами, пустое поле. Ратуша и рабочий выставляются всегда.
 */
export const SandboxSetup = () => {
  const [category, setCategory] = useState('Юниты');
  const scenario = useSandboxStore(state => state.scenario);
  const setScenario = useSandboxStore(state => state.setScenario);

  const updateSide = (index: number, side: SandboxSide) => {
    const sides = [...scenario.sides] as SandboxScenario['sides'];
    sides[index] = side;
    setScenario({ ...scenario, sides });
  };

  return (
    <div className={styles.Setup}>
      <Checkbox
        className={styles.Check}
        checked={scenario.emptyField}
        onChange={emptyField => setScenario({ ...scenario, emptyField })}
      >
        Пустое поле без рельефа
      </Checkbox>

      <div
        className={styles.Categories}
        role='group'
        aria-label='Категория состава'
      >
        {['Юниты', 'Здания', 'Ресурсы'].map(item => (
          <button
            key={item}
            type='button'
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className={styles.Roster}>
        <table className={styles.Table} aria-label={category}>
          <thead>
            <tr>
              <th scope='col'>{category}</th>
              {scenario.sides.map((side, index) => (
                <th
                  scope='col'
                  key={PARTICIPANT_IDS[index]}
                  data-owner={PARTICIPANT_IDS[index]}
                >
                  {OWNER_NAME[PARTICIPANT_IDS[index]]}
                  <SideControls
                    owner={PARTICIPANT_IDS[index]}
                    side={side}
                    onChange={next => updateSide(index, next)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.filter(row => row.category === category).map(row => (
              <tr key={row.key}>
                <th scope='row'>{row.label}</th>
                {scenario.sides.map((side, index) => (
                  <td key={PARTICIPANT_IDS[index]}>
                    <NumberField
                      data-filled={row.get(side) > 0}
                      max={row.max}
                      aria-label={`${row.label}: ${OWNER_NAME[PARTICIPANT_IDS[index]]}`}
                      value={row.get(side)}
                      onChange={count =>
                        updateSide(index, row.set(side, count))
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.Hint}>
        Ратуша и рабочий есть у каждой стороны. Туман можно отключить в режиме
        отладки.
      </p>
    </div>
  );
};
