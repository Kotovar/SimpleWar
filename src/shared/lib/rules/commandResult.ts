import {
  REJECTION_MESSAGE,
  type CommandRejection,
  type RejectionCode,
} from '@shared/config';

/** Успешный итог команды. */
export const ok = { ok: true } as const;

/**
 * Создаёт ожидаемый отказ команды.
 *
 * @param code - Причина отказа.
 * @param message - Текст для игрока; по умолчанию общий текст причины.
 * @returns Отказ без изменения состояния.
 */
export const reject = (
  code: RejectionCode,
  message = REJECTION_MESSAGE[code],
): CommandRejection => ({ ok: false, kind: 'rejected', code, message });

/**
 * Создаёт сбой: команда упала не по правилам игры.
 *
 * @param detail - Технические подробности для отладки.
 * @returns Сбой с общим текстом для игрока.
 */
export const failure = (detail: string): CommandRejection => ({
  ok: false,
  kind: 'failure',
  code: 'failure',
  message: REJECTION_MESSAGE.failure,
  detail,
});
