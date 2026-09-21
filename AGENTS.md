# SimpleWar

Браузерная пошаговая стратегия Simple Wars. React + TypeScript, Zustand/Immer,
Canvas; сборка Vite (пакет `rolldown-vite`). Описание игры: [docs/README.md](docs/README.md).

- Перед работой прочитай `~/.agents/AGENTS.md`.
- Слои: `src/app` → `widgets` → `features` → `entities` → `shared`.
  Сохраняй существующие публичные экспорты `index.ts` и алиасы `@…/*`.
- Баланс и типы — `src/shared/config`; состояние — `entities/*/model`;
  игровые действия — `features`; карта и управление — `widgets`.
- Для поиска кода предпочитай codebase-memory-mcp; проверь путь индекса,
  при отсутствии индекса вызови `index_repository`. При неполных результатах
  читай файлы напрямую: индексатор может пропускать `src/features/build`.
- Для документации по библиотекам используй Context7: `resolve-library-id`,
  затем `query-docs`.
- При написании unit-тестов по заданным файлам/папкам прочитай проектный скил
  [simplewar-unit-tests](skills/simplewar-unit-tests/SKILL.md).
- После изменений кода: `npm run type-check`, `npm run lint`, `npm run build`;
  после изменений структуры также `npm run fsd-check`. Тестового скрипта нет.
- При изменении механик обновляй соответствующий файл в `docs`.
  Отличай реализованное поведение от конфигурации и заготовок.
- Не меняй посторонние файлы; коммиты и push — только по просьбе.
