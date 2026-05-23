# Деплой

> 2026-05-22

## Окружения

| Окружение | URL | Триггер |
|---|---|---|
| **Production** | `https://smetalabs.vercel.app` | Push в `main` |
| **Preview** | per-branch URL (automatic) | Pull Request |

## Платформа

- **Хостинг:** [Vercel](https://vercel.com)
- **Фреймворк:** Next.js 16 (App Router)
- **Пакетный менеджер:** pnpm (определяется автоматически по `pnpm-lock.yaml`)
- **База данных:** Supabase (внешний сервис, не деплоится вместе с приложением)

## Конфигурация Vercel

Проект **не имеет** `vercel.json` — используется автоматическое определение Vercel:

- **Build Command:** `next build` (автоопределение)
- **Output Directory:** `.next` (автоопределение)
- **Install Command:** `pnpm install` (автоопределение по lock-файлу)
- **Framework:** Next.js (автоопределение)

При необходимости добавить `vercel.json` в корень проекта для кастомных настроек (редиректы, заголовки, функции).

## Переменные окружения

Настроены в Vercel Dashboard (Project → Settings → Environment Variables):

| Переменная | Назначение | Окружения |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase-проекта | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Публичный anon-ключ Supabase | Production, Preview |
| `NEXT_PUBLIC_APP_URL` | URL приложения (для редиректов) | Production, Preview |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` — **только server-side**. Никогда не передаётся в браузер. Используется для операций с повышенными привилегиями.

## Процедура деплоя

```
Создать ветку → Реализовать фичу → Открыть PR
       ↓
Vercel создаёт Preview-деплой автоматически
       ↓
Проверить preview (ручное тестирование)
       ↓
Merge PR в main
       ↓
Vercel деплоит в Production автоматически
```

### Ручной деплой (если нужен)

```bash
# Локальная сборка для проверки
pnpm build

# Установка Vercel CLI (один раз)
pnpm add -g vercel

# Деплой в preview (без merge)
vercel

# Деплой в production (форсированный)
vercel --prod
```

## Локальный запуск

```bash
pnpm dev          # Dev-сервер с turbopack (http://localhost:3000)
pnpm build        # Production-сборка
pnpm start        # Запуск production-сборки локально
```

## Мониторинг

- **Vercel Dashboard** — логи сборок, аналитика, ошибки рантайма
- **Supabase Dashboard** — логи БД, RLS-ошибки, usage-метрики

## История деплоев

Документ `docs/deployment-notes.md` отсутствует. История деплоев ведётся автоматически:

- **GitHub:** история коммитов в `main` (один коммит = один деплой)
- **Vercel:** список деплоев в Dashboard (Project → Deployments)

## Откат

1. Vercel Dashboard → Deployments → выбрать предыдущий деплой → «Promote to Production»
2. Либо: `git revert` проблемного коммита → push → автодеплой

## Безопасность

- Все `NEXT_PUBLIC_*` переменные доступны в браузере — **не хранить в них секреты**
- `SUPABASE_SERVICE_ROLE_KEY` — только в server-side коде (API routes, Server Components, middleware)
- RLS-политики Supabase — основной рубеж защиты данных
