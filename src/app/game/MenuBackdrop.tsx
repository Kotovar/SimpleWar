import { useEffect, useRef, useState } from 'react';
import {
  PARTICIPANT_IDS,
  DEFAULT_PALETTES,
  getParticipantPalette,
  getTeamStyle,
  type Cell,
} from '@shared/config';
import {
  drawArcher,
  drawBarracks,
  drawBase,
  drawRider,
  drawSwordsman,
  drawTower,
  drawWorker,
} from '@shared/ui';
import { generateMap, randomSeed } from '@entities/maps';
import { useSettingsStore } from '@entities/settings';
import { useGameLoopStore } from '@entities/games';
import { useSandboxStore } from '@features/sandbox';
import { renderTerrainLayer } from '@widgets/map';
import styles from './styles.module.css';

/** Размер клетки фона, CSS px: крупнее игрового, чтобы рисунок читался. */
const CELL = 44;

type Draw = typeof drawBase;

/** Охрана лагеря игрока и лагерей ИИ. */
const GUARDS: Draw[][] = [
  [drawBase, drawBarracks, drawSwordsman, drawArcher, drawWorker],
  [drawBase, drawTower, drawRider, drawSwordsman, drawArcher],
];
const CAMP_POSITIONS = [
  { x: 0.13, y: 0.2 },
  { x: 0.87, y: 0.8 },
  { x: 0.87, y: 0.2 },
  { x: 0.13, y: 0.8 },
];

/** Ближайшие к точке клетки травы по спирали квадратов. */
const grassAround = (grid: Cell[][], cx: number, cy: number, count: number) => {
  const found: Cell[] = [];
  for (let r = 0; r < 8 && found.length < count; r++) {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== r) continue;
        const cell = grid[y]?.[x];
        if (cell?.type === 'grass' && found.length < count) found.push(cell);
      }
    }
  }
  return found;
};

/**
 * Фон главного меню: случайная карта с лагерями выбранных сторон.
 * При смене числа сторон меняются лагеря, а сид рельефа сохраняется.
 */
export const MenuBackdrop = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [seed] = useState(randomSeed);
  const aiCount = useSettingsStore(state => state.aiSetups.length);
  const choices = useSettingsStore(state => state.paletteChoices);
  const phase = useGameLoopStore(state => state.phase);
  const participants = useGameLoopStore(state => state.participants);
  const sandboxCount = useSandboxStore(state =>
    state.enabled ? state.scenario.sides.length : null,
  );
  const count =
    phase === 'setup' ? (sandboxCount ?? aiCount + 1) : participants.length;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    // Запас по краям — под дрейф и масштаб анимации.
    const columns = Math.min(100, Math.ceil((innerWidth * 1.2) / CELL) + 2);
    const rows = Math.min(100, Math.ceil((innerHeight * 1.2) / CELL) + 2);
    const grid = generateMap(columns, rows, seed);
    const ratio = Math.min(2, devicePixelRatio || 1);
    canvas.width = columns * CELL * ratio;
    canvas.height = rows * CELL * ratio;
    canvas.style.width = `${columns * CELL}px`;
    canvas.style.height = `${rows * CELL}px`;
    ctx.scale(ratio, ratio);
    renderTerrainLayer(ctx, grid, CELL, columns);
    for (const [index, owner] of PARTICIPANT_IDS.slice(0, count).entries()) {
      const at = CAMP_POSITIONS[index];
      const entities = GUARDS[index === 0 ? 0 : 1];
      const choice = choices[owner];
      const palette =
        phase === 'setup'
          ? sandboxCount !== null || choice === 'random'
            ? DEFAULT_PALETTES[owner]
            : choice
          : getParticipantPalette(owner, participants);
      const team = getTeamStyle(owner, palette);
      // Случайный цвет определяется при старте; в меню лагерь пока нейтральный.
      if (phase === 'setup' && sandboxCount === null && choice === 'random') {
        Object.assign(team, {
          color: '#b8c3c9',
          shade: '#74838e',
          background: '#2c3942',
        });
      }
      const cells = grassAround(
        grid,
        Math.round(columns * at.x),
        Math.round(rows * at.y),
        entities.length,
      );
      cells.forEach((cell, index) =>
        entities[index](ctx, cell.x, cell.y, CELL, owner, 1, team),
      );
    }
  }, [count, seed, choices, participants, phase, sandboxCount]);

  return (
    <div className={styles.Backdrop} aria-hidden>
      <canvas ref={ref} />
    </div>
  );
};
