# Документация SmetaLab

> 2026-05-22 · v0.0.1

Навигационный хаб всей документации проекта.

## 🗺️ Карта документации

### Корневые документы (`docs/`)

| Документ | Содержание | Для кого |
|---|---|---|
| [getting-started.md](./getting-started.md) | Быстрый старт, локальный запуск, первые шаги | 🆕 Новички |
| [architecture.md](./architecture.md) | Архитектура фронтенда: роутинг, состояние, слои | 🏗️ Разработчики |
| [backend-architecture.md](./backend-architecture.md) | Бэкенд: Supabase, БД-схема, RLS, API | 🗄️ Бэкенд-разработчики |
| [design-system.md](./design-system.md) | Дизайн-система: 34+ UI-компонента, токены | 🎨 Дизайнеры, фронтенд |
| [directory-module-standard.md](./directory-module-standard.md) | Стандарт построения модулей-справочников | 👷 Разработчики справочников |
| [search-system.md](./search-system.md) | Архитектура поиска по всем модулям | 🔍 Разработчики поиска |
| [deployment.md](./deployment.md) | Деплой: Vercel, переменные окружения, процедура | 🚀 DevOps |
| [testing-strategy.md](./testing-strategy.md) | Стратегия тестирования, планы, моки | 🧪 QA, разработчики |
| [filemap.md](./filemap.md) | Полная карта исходного кода (все файлы) | 🗺️ Все |
| [designer-prompt.md](./designer-prompt.md) | AI-промпт для дизайн-генерации | 🤖 AI-ассистенты |
| [ui-audit.md](./ui-audit.md) | Аудит UI: несоответствия макетам, баги | 🎨 Дизайнеры |

### Feature-документы (`features/<name>/docs/README.md`)

Документация отдельных модулей. ✅ = есть документация, ⬜ = ожидается.

| Модуль | Документация | Статус |
|---|---|---|
| [access-control](./features/access-control/docs/README.md) | ✅ | production (backend), mock (frontend) |
| [account-settings](./features/account-settings/docs/README.md) | ✅ | production (backend), not implemented (frontend) |
| [auth](./features/auth/) | ⬜ | login/signup/forgot-password |
| [dashboard](./features/dashboard/) | ⬜ | главная страница после входа |
| [directories](./features/directories/) | ⬜ | общий layout справочников |
| [directory-counterparties](./features/directory-counterparties/docs/README.md) | ✅ | mock (вёрстка) |
| [directory-materials](./features/directory-materials/docs/README.md) | ✅ | production |
| [directory-suppliers](./features/directory-suppliers/docs/README.md) | ✅ | mock (вёрстка) |
| [directory-works](./features/directory-works/docs/README.md) | ✅ | production |
| [estimates](./features/estimates/docs/README.md) | ✅ | вёрстка + моки, БД готова |
| [execution](./features/execution/) | ⬜ | исполнение смет |
| [global-purchases](./features/global-purchases/docs/README.md) | ✅ | вёрстка + моки, БД готова |
| [projects](./features/projects/docs/README.md) | ✅ | вёрстка-заглушка, БД готова |
| [purchases](./features/purchases/) | ⬜ | закупки |
| [workspace-settings](./features/workspace-settings/docs/README.md) | ✅ | production (backend), not implemented (frontend) |

**Итого:** 10 из 15 модулей имеют документацию.

## 🧭 Как использовать

### Я новичок — с чего начать?

1. **[getting-started.md](./getting-started.md)** — клонировать, запустить, авторизоваться
2. **[architecture.md](./architecture.md)** — понять, как устроен проект
3. **[filemap.md](./filemap.md)** — найти нужный файл

### Я хочу понять архитектуру

1. **[architecture.md](./architecture.md)** — фронтенд: роутинг, состояние (Redux), слои
2. **[backend-architecture.md](./backend-architecture.md)** — Supabase, таблицы, RLS-политики, API
3. **[design-system.md](./design-system.md)** — UI-компоненты и дизайн-токены

### Я работаю над фичей

1. Найти модуль в [таблице выше](#feature-документы-featuresnamedocsreadmemd)
2. Прочитать его `docs/README.md`
3. Следовать [directory-module-standard.md](./directory-module-standard.md) для справочников
4. При необходимости — [search-system.md](./search-system.md) для интеграции поиска

### Я делаю деплой

1. **[deployment.md](./deployment.md)** — окружения, переменные, процедура

### Я хочу написать тесты

1. **[testing-strategy.md](./testing-strategy.md)** — текущее состояние, план, моки

## 📝 Как добавить документацию

### Для новой фичи

Создать `features/<name>/docs/README.md` по шаблону:

```markdown
# Название модуля

> Статус: <production|mock|not implemented> | YYYY-MM-DD

## Назначение
<!-- 1-2 предложения: что делает модуль -->

## Структура
<!-- Основные файлы и их роли -->
- `components/` — UI-компоненты
- `hooks/` — кастомные хуки
- `__mocks__/` — данные-заглушки

## БД-таблицы
<!-- Какие таблицы и RLS-политики использует модуль -->

## API
<!-- Эндпоинты, RPC-функции -->

## Состояние реализации
<!-- Что готово, что в работе, что планируется -->
```

### Для корневого документа

Добавить `.md` файл в `docs/` и зарегистрировать его в этой таблице.

## 🔗 Полезные ссылки

- **Production:** [smetalabs.vercel.app](https://smetalabs.vercel.app)
- **Supabase Dashboard:** [supabase.com/dashboard](https://supabase.com/dashboard)
- **Репозиторий:** GitHub (private)
