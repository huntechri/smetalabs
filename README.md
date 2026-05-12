# SmetaLab

Multi-tenant SaaS для управления строительными сметами, проектами, закупками, командой и настройками workspace.

> **Статус:** активная разработка. В проекте уже есть frontend-shell, auth/RBAC слой, Supabase Auth, Drizzle schema/migrations, workspace/team management и настройки аккаунта/workspace. Часть бизнес-модулей всё ещё работает на моках и постепенно подключается к backend.

## Стек

| Категория | Технологии |
|---|---|
| Фреймворк | [Next.js 16](https://nextjs.org/) App Router |
| UI | [shadcn/ui](https://ui.shadcn.com/) (radix-mira) |
| Стили | [Tailwind CSS v4](https://tailwindcss.com/) |
| Язык | TypeScript |
| Auth | Supabase Auth, `@supabase/ssr` |
| DB | PostgreSQL, Drizzle ORM |
| RBAC | roles / permissions / workspace membership |
| Пакетный менеджер | pnpm |
| Таблицы | @tanstack/react-table |
| Графики | Recharts |
| Drag & Drop | @dnd-kit |
| Иконки | Phosphor Icons, Tabler Icons |

## Быстрый старт

```bash
# 1. Клонировать
git clone <repo-url>
cd smetalabs

# 2. Установить зависимости
pnpm install

# 3. Запустить dev-сервер
pnpm dev
```

Открыть [http://localhost:3000](http://localhost:3000).

**Требования:** Node.js ≥22, pnpm ≥9.

## Основная структура

```txt
smetalabs/
├── app/                    # Next.js routes, layouts, API routes, server actions
├── features/               # feature-owned UI, hooks, screens
├── components/ui/          # shadcn/ui primitives only
├── lib/                    # Supabase clients, auth helpers, shared infra
├── db/                     # Drizzle schema, migrations, seed scripts
├── types/                  # shared cross-feature TypeScript types
├── docs/                   # architecture, filemap, design-system
└── public/                 # static assets
```

## Документация

- [Architecture Guide](docs/architecture.md) — архитектурные слои, ownership rules, auth/invite flow
- [Filemap](docs/filemap.md) — актуальная карта папок и файлов
- [Design System](docs/design-system.md) — shadcn/ui, tokens, typography, визуальные правила

## Важные архитектурные правила

- `components/ui/**` — только shadcn/ui primitives и approved primitive extensions.
- Feature-specific UI хранится в `features/<feature>/components/**`.
- Route files в `app/**` должны быть тонкими и делегировать крупный UI в `features/**`.
- Auth/RBAC/workspace helper logic хранится в `lib/auth/**`.
- Supabase client/session infrastructure хранится в `lib/supabase/**`.
- DB schema и migrations хранятся в `db/**`.
- При изменении routing/auth/folder ownership нужно обновлять docs.

## Скрипты

| Команда | Назначение |
|---|---|
| `pnpm dev` | Dev-сервер с Turbopack |
| `pnpm build` | Production-сборка |
| `pnpm start` | Запуск production-сервера |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |
| `pnpm typecheck` | Проверка типов TypeScript |
