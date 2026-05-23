# Быстрый старт SmetaLab

> 2026-05-22

## Требования

- **Node.js** ≥ 18 (Next.js 16)
- **pnpm** — менеджер пакетов (lock-файл: `pnpm-lock.yaml`)
- **Supabase CLI** — опционально, для локальной разработки с миграциями

Поле `engines` в `package.json` не задано.

## Установка

```bash
git clone <repo-url> smetalabs
cd smetalabs
pnpm install
```

### Переменные окружения

Создать `.env.local` в корне проекта:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Только для серверных операций (не публиковать!)
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

## Разработка

```bash
pnpm dev          # Запуск dev-сервера (Turbopack) на http://localhost:3000
pnpm build        # Production-сборка
pnpm start        # Запуск production-сервера
pnpm lint         # ESLint
pnpm format       # Prettier (все .ts/.tsx файлы)
pnpm typecheck    # TypeScript без эмита (tsc --noEmit)
```

### Флоу разработки

1. **Клонировать репо**, создать ветку от `feature`
2. `pnpm install` + создать `.env.local` с ключами Supabase
3. `pnpm dev` — работает на http://localhost:3000
4. Страницы авторизации: `/auth/login`, `/auth/signup`, `/auth/forgot-password`
5. После входа — редирект на `/dashboard`
6. Все защищённые страницы требуют сессии (middleware проверяет)

### Аутентификация

- **Supabase Auth** — email/password, сессии в куках
- Middleware обновляет сессию при каждом запросе
- Без сессии — редирект на `/auth/login?redirect=<original-path>`

### База данных

- Схема описывается с помощью **Drizzle ORM** в `db/schema/`
- SQL-миграции генерируются через `drizzle-kit` и хранятся в репозитории (`db/migrations/`)
- Применение миграций и работа с базой на сервере: прямые запросы через `@supabase/supabase-js` (в рантайме) и RPC-функции Pl/pgSQL для атомарных мутаций смет
- Для локальных экспериментов — создать отдельный Supabase-проект и применить миграции с помощью `pnpm db:migrate`

## Структура проекта

```
smetalabs/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Страницы авторизации (login, signup, forgot-password)
│   ├── (main)/             # Основной интерфейс (с sidebar)
│   │   ├── dashboard/      # Дашборд
│   │   ├── projects/       # Проекты → сметы → (execution, purchases, documents, finances)
│   │   ├── directories/    # Справочники (works, materials, suppliers, counterparties)
│   │   ├── procurements/   # Сводные закупки
│   │   ├── team/           # Управление командой
│   │   └── templates/      # Шаблоны смет
│   ├── admin/              # Админ-панель
│   └── api/                # API Routes (team/roles, team/members)
├── components/             # Общие UI-компоненты (shadcn/ui в components/ui/)
├── features/               # Бизнес-фичи (по доменам)
│   ├── auth/               # Формы авторизации
│   ├── dashboard/          # Дашборд (графики, таблицы)
│   ├── projects/           # Карточки проектов
│   ├── estimates/          # Редактор смет (секции/работы/материалы)
│   ├── purchases/          # Закупки в смете
│   ├── execution/          # Выполнение
│   ├── global-purchases/   # Сводные закупки
│   ├── directory-works/    # Справочник работ
│   ├── directory-materials/# Справочник материалов
│   ├── directory-suppliers/# Справочник поставщиков
│   └── directory-counterparties/ # Справочник контрагентов
├── types/                  # Общие типы (estimate, purchase, execution, roles, directories)
├── lib/                    # Утилиты и серверная логика
│   ├── supabase/           # Клиенты Supabase (server, client, admin, middleware)
│   ├── auth/               # RBAC-хелперы (permissions.ts)
│   ├── validators/         # Zod-схемы (team.ts)
│   ├── utils.ts            # cn() — мёрдж Tailwind-классов
│   ├── formatters.ts       # formatMoney, formatDate, formatConsumption
│   └── calculations.ts     # getTotal() — quantity × price
├── hooks/                  # Общие хуки (use-mobile)
├── middleware.ts            # Next.js middleware (auth guard)
├── docs/                   # Документация
│   ├── getting-started.md       # ← этот документ
│   ├── architecture.md          # Общая архитектура
│   ├── backend-architecture.md  # Бэкенд-архитектура
│   ├── design-system.md         # Дизайн-система
│   ├── search-system.md         # Архитектура поиска
│   ├── testing-strategy.md      # Стратегия тестирования
│   ├── filemap.md               # Карта файлов проекта
│   └── README.md                # Навигация по документации
├── package.json
├── tsconfig.json
└── next.config.mjs
```

## Первый PR

### Чеклист (из `.github/pull_request_template.md`)

**Документация:**
- [ ] `docs/filemap.md` — обновлена структура (новые файлы, слои, правила)
- [ ] `docs/design-system.md` — обновлены компоненты/токены/паттерны (если менялся UI)
- [ ] `README.md` — актуальный быстрый старт и скрипты

**Код:**
- [ ] `pnpm typecheck` — без ошибок TypeScript
- [ ] Новые файлы соответствуют структуре из `docs/filemap.md`
- [ ] Бизнес-логика не в компонентах (вынесена в `hooks/`, `lib/`, `services/`)
- [ ] Типы вынесены в `types/`

**В описании PR:** кратко описать сделанные изменения.

## Архитектурные принципы (кратко)

- **Стек**: Next.js 16 App Router + Supabase (PostgreSQL) + shadcn/ui + Tailwind v4
- **Данные**: Server Components для чтения, RPC-функции для мутаций
- **Авторизация**: RBAC (5 ролей × 19 прав), проверка через `lib/auth/permissions.ts`
- **Изоляция**: Multi-tenant через `workspace_owner_id` + RLS
- **Структура фич**: `features/{domain}/` → `components/` + `hooks/` + `__mocks__/`
