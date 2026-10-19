import { DEFAULT_AI_SETUP, type AiSetup } from './aiProfiles';

/** ID слотов участников. Слот задаёт цвет и маркер стороны, а не способ управления. */
export const PARTICIPANT_IDS = ['p1', 'p2', 'p3', 'p4'] as const;

/** ID участника партии. */
export type ParticipantId = (typeof PARTICIPANT_IDS)[number];

/**
 * Кто отдаёт приказы участнику. `passive` — только в режиме тестирования:
 * сторона сразу завершает ход.
 */
export type Controller = 'human' | 'ai' | 'passive';

/** Участник партии: владелец объектов и ресурсов с одним способом управления. */
export type Participant = {
  id: ParticipantId; // ponytail: запись на каждый слот, даже неиспользуемый — проще, чем Partial и проверки.
  controller: Controller;
  /** Профиль и сложность ИИ; у человека нет. */
  ai?: AiSetup;
};

/** Состав обычной партии: человек против одного ИИ. */
export const DEFAULT_PARTICIPANTS: Participant[] = [
  { id: 'p1', controller: 'human' },
  { id: 'p2', controller: 'ai', ai: DEFAULT_AI_SETUP },
];

/** Фаза игры. */
export type Phase = 'setup' | 'deployment' | 'inProgress' | 'gameOver';

/**
 * Пауза перед ходом ИИ, мс. Кнопка конца хода в это время заблокирована,
 * поэтому двойной клик не завершает следующий ход человека.
 */
export const AI_TURN_DELAY_MS = 600;

/**
 * Перерыв между порциями хода ИИ, мс: браузер успевает отрисовать кадр.
 * В ускоренном режиме тестирования — без задержки.
 */
export const AI_YIELD_BREAK_MS = 16;

/** Скорость показа действий ИИ; ноль — без анимаций и визуальных пауз. */
export const AI_PLAYBACK_RATE = { normal: 1, fast: 2, instant: 0 } as const;
export type AiPlayback = keyof typeof AI_PLAYBACK_RATE;
/** Пауза после видимого действия ИИ: хватает на самый длинный эффект карты. */
export const AI_ACTION_DELAY_MS = 700;
