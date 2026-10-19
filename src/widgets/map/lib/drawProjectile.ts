import type { Position } from '@shared/config';

/** Вид снаряда: стрела лучника и башни, сгусток мага, камень катапульты. */
export type ProjectileKind = 'arrow' | 'magic' | 'stone';

/** Высота дуги в клетках. */
const ARC: Record<ProjectileKind, number> = {
  arrow: 0.35,
  magic: 0,
  stone: 1.4,
};

/**
 * Рисует снаряд между центрами клеток: стрела по дуге с оперением,
 * светящийся сгусток со шлейфом или камень катапульты по высокой дуге.
 *
 * @param progress - Доля полёта от 0 до 1.
 */
export const drawProjectile = (
  ctx: CanvasRenderingContext2D,
  kind: ProjectileKind,
  from: Position,
  to: Position,
  progress: number,
  cellSize: number,
) => {
  const point = (t: number) => {
    // Стрела летит по дуге, камень — по высокой, сгусток — прямо.
    const lift = Math.sin(Math.PI * t) * ARC[kind];
    return [
      (from.x + (to.x - from.x) * t + 0.5) * cellSize,
      (from.y + (to.y - from.y) * t + 0.5 - lift) * cellSize,
    ];
  };
  const [x, y] = point(progress);
  const [px, py] = point(Math.max(0, progress - 0.06));
  const angle = Math.atan2(y - py, x - px);
  const scale = cellSize / 32;

  ctx.save();
  ctx.translate(x, y);
  if (kind === 'stone') {
    // Камень вращается; ближе к вершине дуги — крупнее.
    const size = (4 + Math.sin(Math.PI * progress) * 2.5) * scale;
    ctx.rotate(progress * Math.PI * 4);
    ctx.fillStyle = '#8d8f88';
    ctx.strokeStyle = '#2c2f2a';
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.moveTo(-size, -size * 0.3);
    ctx.lineTo(-size * 0.4, -size);
    ctx.lineTo(size * 0.6, -size * 0.8);
    ctx.lineTo(size, size * 0.1);
    ctx.lineTo(size * 0.3, size);
    ctx.lineTo(-size * 0.7, size * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(-size * 0.3, -size * 0.35, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (kind === 'magic') {
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 7 * scale);
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    glow.addColorStop(0.35, 'rgba(196, 150, 255, 0.9)');
    glow.addColorStop(1, 'rgba(140, 90, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 7 * scale, 0, Math.PI * 2);
    ctx.fill();
    // Шлейф позади сгустка.
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(176, 130, 255, 0.45)';
    ctx.beginPath();
    ctx.moveTo(-2 * scale, -2.5 * scale);
    ctx.lineTo(-12 * scale, 0);
    ctx.lineTo(-2 * scale, 2.5 * scale);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.rotate(angle);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(28, 36, 32, 0.6)';
  ctx.lineWidth = 2.6 * scale;
  ctx.beginPath();
  ctx.moveTo(-9 * scale, 0);
  ctx.lineTo(4 * scale, 0);
  ctx.stroke();
  ctx.strokeStyle = '#c99a5b';
  ctx.lineWidth = 1.3 * scale;
  ctx.stroke();
  // Наконечник и оперение.
  ctx.fillStyle = '#dfe6ea';
  ctx.beginPath();
  ctx.moveTo(7 * scale, 0);
  ctx.lineTo(3 * scale, -2.2 * scale);
  ctx.lineTo(3 * scale, 2.2 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8edf2';
  ctx.beginPath();
  ctx.moveTo(-9 * scale, 0);
  ctx.lineTo(-11.5 * scale, -2.4 * scale);
  ctx.lineTo(-7 * scale, 0);
  ctx.lineTo(-11.5 * scale, 2.4 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};
