import {
  BUILDINGS_NAME,
  OWNER_NAME,
  PARTICIPANT_IDS,
  SANDBOX_LIMITS,
  UNITS_NAME,
  type Controller,
  type SandboxBuildingType,
  type SandboxScenario,
  type SandboxSide,
  type UnitType,
} from '@shared/config';
import { useSandboxStore } from '@features/sandbox';
import styles from './Sandbox.styles.module.css';

const UNIT_TYPES = Object.keys(UNITS_NAME) as UnitType[];
const BUILDING_TYPES = (
  Object.keys(BUILDINGS_NAME) as SandboxBuildingType[]
).filter(type => (type as string) !== 'base');

const CONTROLLERS: { value: Controller; label: string }[] = [
  { value: 'human', label: 'Человек' },
  { value: 'ai', label: 'ИИ' },
  { value: 'passive', label: 'Пассивная' },
];

/** Целое в пределах; пустое поле — 0. */
const toCount = (text: string, max: number) =>
  Math.min(max, Math.max(0, Math.floor(Number(text) || 0)));

type Row = {
  key: string;
  label: string;
  max: number;
  get: (side: SandboxSide) => number;
  set: (side: SandboxSide, value: number) => SandboxSide;
};

const ROWS: Row[] = [
  ...UNIT_TYPES.map(type => ({
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
  const scenario = useSandboxStore(state => state.scenario);
  const setScenario = useSandboxStore(state => state.setScenario);

  const updateSide = (index: number, side: SandboxSide) => {
    const sides = [...scenario.sides] as SandboxScenario['sides'];
    sides[index] = side;
    setScenario({ ...scenario, sides });
  };

  return (
    <div className={styles.Setup}>
      <label className={styles.Check}>
        <input
          type='checkbox'
          checked={scenario.emptyField}
          onChange={e =>
            setScenario({ ...scenario, emptyField: e.target.checked })
          }
        />
        Пустое поле без рельефа
      </label>

      <table className={styles.Table}>
        <thead>
          <tr>
            <th />
            {scenario.sides.map((side, index) => (
              <th
                key={PARTICIPANT_IDS[index]}
                data-owner={PARTICIPANT_IDS[index]}
              >
                {OWNER_NAME[PARTICIPANT_IDS[index]]}
                <select
                  aria-label={`Управление: ${OWNER_NAME[PARTICIPANT_IDS[index]]}`}
                  value={side.controller}
                  onChange={e =>
                    updateSide(index, {
                      ...side,
                      controller: e.target.value as Controller,
                    })
                  }
                >
                  {CONTROLLERS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map(row => (
            <tr key={row.key}>
              <th scope='row'>{row.label}</th>
              {scenario.sides.map((side, index) => (
                <td key={PARTICIPANT_IDS[index]}>
                  <input
                    type='number'
                    min={0}
                    max={row.max}
                    aria-label={`${row.label}: ${OWNER_NAME[PARTICIPANT_IDS[index]]}`}
                    value={row.get(side)}
                    onChange={e =>
                      updateSide(
                        index,
                        row.set(side, toCount(e.target.value, row.max)),
                      )
                    }
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.Hint}>
        Ратуша и рабочий есть у каждой стороны. Размер карты и сид — выше. Туман
        можно отключить в режиме отладки.
      </p>
    </div>
  );
};
