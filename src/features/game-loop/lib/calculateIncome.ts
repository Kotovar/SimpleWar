import type { Building, Resources } from '@shared/config';

export const calculateIncome = (buildings: Building[]): Resources => {
  return buildings.reduce(
    (acc, building) => {
      if (!building.income) return acc;

      if (building.income.gold) acc.gold += building.income.gold;
      if (building.income.wood) acc.wood += building.income.wood;

      return acc;
    },
    { gold: 0, wood: 0 },
  );
};
