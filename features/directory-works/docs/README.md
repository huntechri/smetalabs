# Справочник работ (directory-works)

> 2026-05-23 · статус: полностью реализован (production-ready бэкенд и фронтенд с интеграцией гибридного поиска, импорта и экспорта).

---

## Назначение

Справочник работ — центральный каталог строительных и ремонтных работ. Хранит эталонные расценки, единицы измерения, категории и поисковые индексы. Используется сметным модулем для наполнения смет работами из каталога.

**Масштаб данных:** 723 активные записи, 4 071 синонимов, 6 543 ключевых слов, 724 векторных эмбеддинга.

---

## Структура модуля

```
features/directory-works/
├── api/
│   ├── directory-works-client.ts              # API-клиент для работы со справочником
│   ├── directory-works-errors.ts              # Адаптер ошибок API
│   ├── directory-works-mappers.ts             # Мапперы сетевых ответов к доменным сущностям
│   └── directory-works-query-keys.ts          # Ключи кэша React Query
├── application/
│   ├── use-directory-work-categories.ts       # Хук получения списка категорий
│   └── use-directory-works.ts                 # Основной хук для списка, мутаций и импорта
├── model/
│   ├── directory-works-model.ts               # Доменные типы, валидация форм, selectors, events
│   └── directory-works-model.test.ts          # Юнит-тесты доменной логики и валидаторов
├── ui/
│   ├── directory-works-view.tsx               # Основное представление справочника работ
│   ├── directory-works-section.tsx            # Секция отображения списка работ
│   ├── directory-works-row.tsx                # Строка конкретной работы
│   ├── directory-works-category-filter.tsx    # Фильтр по категориям и подкатегориям
│   ├── directory-work-form-dialog.tsx         # Диалог создания и редактирования работы
│   └── directory-work-import-dialog.tsx       # Диалог пошагового импорта из CSV
└── server/
    ├── directory-works-import.repository.ts   # Репозиторий импорта CSV
    ├── directory-works-large-import.repository.ts # Оптимизированный репозиторий большого импорта
    ├── directory-works.embeddings.ts          # Логика генерации и синхронизации эмбеддингов
    ├── directory-works.export.ts              # Логика экспорта в Excel (XLSX)
    ├── directory-works.observability.ts       # Метрики и логирование производительности
    ├── directory-works.ordering.ts            # Управление сортировкой
    ├── directory-works.repository.ts          # Базовые CRUD-операции справочника с БД
    ├── directory-works.route-handlers.ts      # Обработчики Next.js Route Handlers
    ├── directory-works.schemas.ts             # Zod-схемы валидации
    ├── directory-works.search.ts              # Полнотекстовый и нечеткий поиск
    └── directory-works.service.ts             # Сервис бизнес-логики и контроля прав
```

---

## Данные

### Таблицы базы данных

Все таблицы в схеме `public`, RLS включён, multi-tenant изоляция через `workspace_owner_id`.

#### `directory_works` — основная таблица
| Колонка | Тип | Описание |
|---|---|---|
| `id` | uuid PK | Уникальный идентификатор работы |
| `workspace_owner_id` | uuid FK → `profiles.id` | Tenant-изоляция |
| `title` / `normalized_title` | text | Название работы |
| `unit_code` / `unit_label` | text | Единицы измерения |
| `rate_amount` | numeric | Расценка ≥ 0 |
| `currency_code` | varchar(3) | Код валюты, default `'RUB'` |
| `price_kind` | enum | `base`, `labor`, `turnkey`, `estimate`, `custom` |
| `category` / `subcategory` | text | Категория и подкатегория |
| `code` | text | Код по классификатору |
| `description` / `included_operations` / `excluded_operations` | text | Текстовые описания и операции |
| `status` | enum | `active`, `archived` |

---

## API (Next.js API Routes)

Взаимодействие между клиентом и сервером полностью реализовано через Next.js Route Handlers под роутом `/api/directory-works`:

- `GET /api/directory-works` — Получить список работ с поддержкой фильтров, пагинации и сортировки.
- `POST /api/directory-works` — Создать новую работу.
- `PATCH /api/directory-works/[id]` — Редактировать работу.
- `DELETE /api/directory-works/[id]` — Архивировать работу.
- `GET /api/directory-works/categories` — Группировка и получение списка категорий и подкатегорий.
- `GET /api/directory-works/export` — Экспорт справочника работ в XLSX-файл.
- `POST /api/directory-works/import-jobs` — Создать задачу импорта и загрузить CSV-файл пакетами.

---

## Поиск (Текстовый + Семантический Гибридный)

Реализована трехпроходная стратегия поиска в `directory-works.search.ts`:
1. **Точное совпадение:** по коду или внешнему ключу.
2. **Быстрый текстовый поиск:** по префиксу названия или FTS (Full-Text Search) в tsvector.
3. **Нечеткий поиск (Fallback):** с использованием триграмм `pg_trgm.similarity()`, если первые два шага не дали результатов.
4. **Гибридный поиск (Hybrid Search):** комбинирует текстовый поиск с семантическим сходством по векторным эмбеддингам (`pgvector` + OpenAI `text-embedding-3-small` 1536 измерений).

---

## Импорт и Экспорт

- **Импорт (CSV):** реализован через пошаговый мастер в диалоге `directory-work-import-dialog.tsx` (Загрузка -> Парсинг -> Валидация -> Предпросмотр дубликатов и конфликтов -> Применение). Используются таблицы `directory_work_import_jobs` и `directory_work_import_rows` для надежного контроля над ходом импорта.
- **Экспорт (Excel):** реализован на бэкенде в `directory-works.export.ts`. Генерирует XLSX-файл для скачивания через стандартные потоки Next.js.

---

## Текущее состояние

| Задача | Статус | Комментарий |
|---|---|---|
| **БД-схема и RLS** | ✅ Готова | Все таблицы, GIN-индексы и RLS-политики настроены. |
| **API Route Handlers** | ✅ Готовы | Полноценные Next.js эндпоинты с валидацией Zod. |
| **Клиентский хук** | ✅ Готов | `useDirectoryWorks` интегрирован с API и React Query. |
| **Фильтрация по категориям**| ✅ Готова | Компонент `directory-works-category-filter.tsx` фильтрует список. |
| **Создание/Редактирование** | ✅ Готово | Диалог `directory-work-form-dialog.tsx` позволяет вносить изменения. |
| **Импорт (CSV)** | ✅ Готов | Полнофункциональный пошаговый мастер импорта. |
| **Экспорт (XLSX)** | ✅ Готов | Формирование и выгрузка Excel-файлов справочника. |
| **Гибридный поиск** | ✅ Готов | Текстовый FTS + семантический векторный поиск. |
