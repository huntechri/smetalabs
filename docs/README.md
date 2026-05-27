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

### Feature-документы (`features/<name>/docs/README.md`)

Документация отдельных модулей. ✅ = есть документация, ⬜ = ожидается.

| Модуль | Документация | Статус |
|---|---|---|
| [access-control](../features/access-control/docs/README.md) | ✅ | production (бэкенд + интерактивная матрица) |
| [account-settings](../features/account-settings/docs/README.md) | ✅ | production (настройки профиля, темы, уведомлений, пароля) |
| [auth](../features/auth/docs/README.md) | ✅ | production (аутентификация, RBAC, сессии) |
| [dashboard](../features/dashboard/docs/README.md) | ✅ | production (RSC-страница, React Query, графики Recharts, DataTable) |
| [directories](../features/directories/docs/README.md) | ✅ | production (общий макет справочников, поиск, категории) |
| [directory-counterparties](../features/directory-counterparties/docs/README.md) | ✅ | production (справочник контрагентов, реквизиты, паспорта) |
| [directory-materials](../features/directory-materials/docs/README.md) | ✅ | production (справочник материалов, категории, импорт/экспорт) |
| [directory-suppliers](../features/directory-suppliers/docs/README.md) | ✅ | production (справочник поставщиков, цвета, реквизиты) |
| [directory-works](../features/directory-works/docs/README.md) | ✅ | production (справочник работ, импорт CSV, экспорт XLSX) |
| [estimates](../features/estimates/docs/README.md) | ✅ | production (сметный редактор, RPC, drag-and-drop) |
| [execution](../features/execution/docs/README.md) | ✅ | mock (план-факт вкладки «Выполнение» в смете) |
| [global-purchases](../features/global-purchases/docs/README.md) | ✅ | production (сводные закупки, фильтры, API) |
| [notifications](../features/notifications/docs/README.md) | ✅ | production (in-app, real-time, email-оповещения) |
| [projects](../features/projects/docs/README.md) | ✅ | production (RSC-страницы, React Query, список проектов, детали, пагинация) |
| [purchases](../features/purchases/docs/README.md) | ✅ | mock (план-факт вкладки «Закупки» в смете) |
| [workspace-settings](../features/workspace-settings/docs/README.md) | ✅ | production (команда, инвайт-ссылки, разрешённые домены) |

**Итого:** Все 16 фич-модулей полностью задокументированы.

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
