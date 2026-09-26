import type { StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type DevtoolsWindow = { __REDUX_DEVTOOLS_EXTENSION__?: unknown };

/**
 * Решает, подключать ли Redux DevTools: только в сборке разработки и только
 * при установленном расширении. В production и без расширения хранилища
 * работают без интеграции и без предупреждений.
 *
 * @param isDev - Сборка разработки.
 * @param host - Глобальный объект, где расширение регистрирует себя.
 * @returns `true`, если интеграцию нужно включить.
 */
export const isDevtoolsEnabled = (
  isDev: boolean = import.meta.env.DEV,
  host: DevtoolsWindow = globalThis as DevtoolsWindow,
) => isDev && !!host.__REDUX_DEVTOOLS_EXTENSION__;

type ImmerDevtoolsCreator<T> = StateCreator<
  T,
  [['zustand/devtools', never], ['zustand/immer', never]],
  []
>;

/**
 * Immer и Redux DevTools с автоматическим именем действия `<store>/<метод>`.
 * Ограничение: имя известно, пока метод выполняется синхронно; `set` после
 * `await` или в колбэке подпишется `<store>/setState`. Геттеры в описании
 * хранилища вызываются при оборачивании — их в хранилищах нет.
 */
const withNamedDevtools = <T extends object>(
  name: string,
  creator: ImmerDevtoolsCreator<T>,
) =>
  devtools(
    immer<T, [['zustand/devtools', never]]>((set, get, api) => {
      let action = `${name}/setState`;
      const namedSet: typeof set = (update, replace) =>
        set(update, replace as false | undefined, action);

      const state = creator(namedSet, get, api);
      for (const [key, value] of Object.entries(state)) {
        if (typeof value !== 'function') continue;
        // Имя действия действует, пока выполняется метод; вложенный вызов
        // другого метода подписывается своим именем и затем восстанавливает.
        (state as Record<string, unknown>)[key] = (...args: unknown[]) => {
          const previous = action;
          action = `${name}/${key}`;
          try {
            return value(...args);
          } finally {
            action = previous;
          }
        };
      }
      return state;
    }),
    { name, enabled: isDevtoolsEnabled() },
  );

/**
 * Подключает Immer и, в сборке разработки, Redux DevTools к хранилищу.
 * В production ветка DevTools вырезается при сборке: остаётся только Immer,
 * лишние аргументы `set` с именем действия он игнорирует.
 *
 * @param name - Имя хранилища в DevTools.
 * @param creator - Обычное описание хранилища с Immer.
 * @returns Описание хранилища для `create<T>()`.
 */
export const withDevtools = <T extends object>(
  name: string,
  creator: ImmerDevtoolsCreator<T>,
): ReturnType<typeof withNamedDevtools<T>> =>
  import.meta.env.DEV
    ? withNamedDevtools(name, creator)
    : (immer(creator as never) as never);
