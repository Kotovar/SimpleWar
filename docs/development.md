# Устройство проекта

Клиентское приложение: React 19, TypeScript, Zustand с Immer, Canvas 2D.
Для карты используются simplex-noise и pathfinding. Сборщик — Vite через
пакет `rolldown-vite`. Отдельного серверного приложения в репозитории нет.

## Где искать код

| Каталог                     | Ответственность                                                            |
| --------------------------- | -------------------------------------------------------------------------- |
| `src/app`                   | Корневой интерфейс, инициализация партии и событий, запуск хода ИИ         |
| `src/widgets/map`           | Слои Canvas, отрисовка, обработка кликов                                   |
| `src/widgets/game-controls` | Настройки, показатели, меню найма и строительства                          |
| `src/widgets/start-game`    | Генерация карты и стартовые объекты                                        |
| `src/features`              | Строительство, найм, бой, ходы, поиск пути и выбор объектов                |
| `src/entities`              | Zustand-хранилища карты, настроек, юнитов, зданий, экономики и фазы партии |
| `src/shared/config`         | Типы, баланс, названия, параметры карты и экономики                        |
| `src/shared/lib`            | Общие расчёты, проверки стоимости, шина событий                            |
| `src/shared/ui`             | Общие диалоги                                                              |

Структура следует слоям FSD; алиасы `@app`, `@widgets`, `@features`, `@entities`,
`@shared` настроены в TypeScript и Vite. Срезы экспортируют API через `index.ts`.
Игровые события связывают появление/уничтожение объектов с населением и победой.

## Команды из package.json

| Команда              | Назначение                           |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Сервер разработки                    |
| `npm run type-check` | Проверка TypeScript без сборки       |
| `npm run lint`       | ESLint                               |
| `npm run build`      | TypeScript и production-сборка       |
| `npm run fsd-check`  | Проверка структуры через Steiger     |
| `npm run preview`    | Просмотр готовой сборки              |
| `npm run format`     | Prettier с перезаписью всего проекта |

Тесты: `npm test` — весь набор, `npm run test:unit` — unit,
`npm run test:integration` — сценарии взаимодействия хранилищ и событий.
Состояние партии находится в `entities/games`, запуск — в
`widgets/start-game/initializeGame.ts`. Для изменений документации достаточно
проверить ссылки и форматирование только затронутых Markdown-файлов.

Источники: [package.json](../package.json), [tsconfig.json](../tsconfig.json),
[vite.config.ts](../vite.config.ts), [события](../src/shared/lib/events.ts).
