/**
 * Режим отладки есть только в dev-сборке: в опубликованной игре (GitHub Pages)
 * его нельзя включить ни из меню, ни загрузкой сохранения.
 */
export const DEBUG_AVAILABLE = import.meta.env.DEV;

/** Исключения режима отладки; каждое включается отдельно для участника. */
export type DebugException = 'freeBuild' | 'instantBuild' | 'freeSpawn';

/** Порядок и подписи исключений в панели отладки. */
export const DEBUG_EXCEPTIONS: { id: DebugException; label: string }[] = [
  { id: 'freeBuild', label: 'Бесплатное строительство' },
  { id: 'instantBuild', label: 'Строительство за один ход' },
  { id: 'freeSpawn', label: 'Бесплатный найм' },
];
