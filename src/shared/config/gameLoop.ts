/** ID слотов участников. Слот задаёт цвет и маркер стороны, а не способ управления. */
export const PARTICIPANT_IDS = ['p1', 'p2', 'p3', 'p4'] as const;

/** ID участника партии. */
export type ParticipantId = (typeof PARTICIPANT_IDS)[number];

/** Кто отдаёт приказы участнику. */
export type Controller = 'human' | 'ai';

/** Участник партии: владелец объектов и ресурсов с одним способом управления. */
export type Participant = {
  id: ParticipantId; // ponytail: запись на каждый слот, даже неиспользуемый — проще, чем Partial и проверки.
  controller: Controller;
};

/** Состав обычной партии: человек против одного ИИ. */
export const DEFAULT_PARTICIPANTS: Participant[] = [
  { id: 'p1', controller: 'human' },
  { id: 'p2', controller: 'ai' },
];

/** Фаза игры. */
export type Phase = 'setup' | 'deployment' | 'inProgress' | 'gameOver';

/**
 * Пауза перед ходом ИИ, мс. Кнопка конца хода в это время заблокирована,
 * поэтому двойной клик не завершает следующий ход человека.
 */
export const AI_TURN_DELAY_MS = 600;
