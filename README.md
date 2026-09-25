# SimpleWar

Simple Wars — браузерная пошаговая стратегия на квадратной карте. Игрок
развивает базу, строит здания, нанимает войска и побеждает, уничтожив ратушу
противника. Проект находится в разработке: ход ИИ пока только передаёт ход,
сохранений партии нет.

Клиент написан на React, TypeScript и Zustand с Immer. Карта и объекты
рисуются на Canvas; сборку и тесты запускает Vite+.

## Запуск

Нужны Node.js и pnpm. Версия pnpm задана в `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

## Проверки

```sh
pnpm type-check
pnpm lint
pnpm test
pnpm build
pnpm fsd-check
```

## Документация

- [Текущее состояние и ограничения](docs/README.md)
- [Правила и экономика](docs/mechanics.md)
- [Устройство проекта и остальные команды](docs/development.md)
- [План развития](docs/ROADMAP.md)
