# SmetaLab

Дашборд для управления строительными сметами и эстимейтами. Проекты, сметы, закупки, финансы — всё в одном интерфейсе.

> ⚠️ **Ранняя стадия:** фронтенд, вёрстка и структура. Бэкенд и работа с данными — в планах.

## Стек

| Категория | Технологии |
|---|---|
| Фреймворк | [Next.js 16](https://nextjs.org/) (App Router) |
| UI | [shadcn/ui](https://ui.shadcn.com/) (radix-mira) |
| Стили | [Tailwind CSS v4](https://tailwindcss.com/) |
| Язык | TypeScript |
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

# 2. Установить зависимости (требуется pnpm)
pnpm install

# 3. Запустить dev-сервер
pnpm dev
```

Открыть [http://localhost:3000](http://localhost:3000).

**Требования:** Node.js ≥22, pnpm ≥9.

## Структура проекта

```
smetalabs/
├── app/                    # Роутинг Next.js (App Router)
│   ├── (auth)/             # Авторизация (логин, регистрация, сброс пароля)
│   └── (main)/             # Основной интерфейс
│       ├── dashboard/      # Дашборд
│       ├── projects/       # Проекты и сметы
│       ├── directories/    # Справочники (контрагенты, материалы, поставщики)
│       └── procurements/   # Закупки
├── features/               # Фиче-компоненты (бизнес-логика интерфейса)
├── components/ui/          # UI-компоненты shadcn/ui
├── hooks/                  # Кастомные хуки
├── lib/                    # Утилиты
└── public/                 # Статика
```

Подробная карта проекта: [`docs/filemap.md`](docs/filemap.md) — описаны все слои, правила именования и сценарии.

## Документация

- [Дизайн-система](docs/design-system.md) — цвета, токены, типографика
- [Карта проекта (filemap)](docs/filemap.md) — структура, слои, правила

## Скрипты

| Команда | Назначение |
|---|---|
| `pnpm dev` | Dev-сервер с Turbopack |
| `pnpm build` | Production-сборка |
| `pnpm start` | Запуск production-сервера |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier (форматирование) |
| `pnpm typecheck` | Проверка типов TypeScript |

