# Архитектура Backend — SmetaLab

> **Статус:** Проект
> **Версия:** 1.0
> **Дата:** 2026-05-11
> **Контекст:** Next.js 16 + shadcn/ui + Tailwind v4, деплой на Vercel.
> Текущее состояние — только фронтенд на моках (`__mocks__/`).
> Документ описывает целевой backend.

---

## Оглавление

1. [Технологический стек](#1-технологический-стек)
2. [Схема базы данных](#2-схема-базы-данных)
   - 2.1 [Общие правила](#21-общие-правила)
   - 2.2 [Полная схема](#22-полная-схема)
   - 2.3 [Row Level Security (RLS)](#23-row-level-security-rls--базовые-политики)
   - 2.4 [Диаграмма таблиц](#24-диаграмма-таблиц)
   - 2.5 [Связи справочников и рабочих таблиц](#25-связи-справочников-и-рабочих-таблиц)
3. [API-дизайн](#3-api-дизайн)
   - 3.1 [Архитектурный принцип](#31-архитектурный-принцип)
   - 3.2 [Server Actions (мутации)](#32-server-actions-мутации)
   - 3.3 [API Routes (чтение)](#33-api-routes-чтение)
   - 3.4 [Параметры фильтрации и поиска](#34-параметры-фильтрации-и-поиска)
4. [Потоки данных](#4-потоки-данных)
   - 4.1 [Страница (Server Component) — чтение](#41-страница-server-component--чтение)
   - 4.2 [Мутация (Client Component → Server Action)](#42-мутация-client-component--server-action)
   - 4.3 [Аутентификация (Supabase Auth)](#43-аутентификация-supabase-auth)
   - 4.4 [Загрузка файлов (Supabase Storage)](#44-загрузка-файлов-supabase-storage)
5. [План миграции с моков на реальные данные](#5-план-миграции-с-моков-на-реальные-данные)
   - 5.1 [Порядок миграции](#51-порядок-миграции)
   - 5.2 [Что меняется в каждой фиче](#52-что-меняется-в-каждой-фиче)
   - 5.3 [Пример: миграция фичи Projects](#53-пример-миграция-фичи-projects)
6. [Структура проекта](#6-структура-проекта)
   - 6.1 [Переменные окружения](#61-переменные-окружения)
7. [Безопасность](#7-безопасность)
   - 7.1 [Многоуровневая защита](#71-многоуровневая-защита)
   - 7.2 [Защита Server Actions](#72-защита-server-actions)
   - 7.3 [RLS-политики](#73-rls-политики-ключевые)
   - 7.4 [Supabase Storage RLS](#74-supabase-storage-rls)
   - 7.5 [Переменные окружения](#75-переменные-окружения)
8. [Приложение: Карта связей](#приложение-карта-связей)
   - A. [Сущность → Таблица](#a-сущность--таблица)
   - B. [Страница → Запрашиваемые данные](#b-страница--запрашиваемые-данные)
   - C. [Связи Foreign Key (полный список)](#c-связи-foreign-key-полный-список)
9. [Чек-лист реализации](#9-чек-лист-реализации)

---

## 1. Технологический стек

| Компонент | Выбор | Обоснование |
|---|---|---|
| **База данных** | PostgreSQL (Supabase) | Реляционная модель идеальна для сметной системы: строгие связи проекты→сметы→работы→материалы. Финансовые данные требуют транзакций и целостности. Supabase — управляемый PostgreSQL, не нужно администрировать. |
| **ORM** | Drizzle ORM | Лёгкий, типобезопасный, без кодогенерации (схема = TypeScript-код). Нативная интеграция с Server Components Next.js — edge-ready. Декларативные миграции. |
| **Аутентификация** | Supabase Auth | Встроена в Supabase: OAuth (Google, GitHub), email/password, magic links. JWT-совместима, сессии — через cookies. Готовый UI-компонент или кастомный. |
| **Мутации (запись)** | Next.js Server Actions | Нет дополнительного API-слоя для форм. Прямой вызов Drizzle из React Server Components. Сквозная типобезопасность: форма → action → БД. Прогрессивная деградация (без JS — обычная форма). |
| **Чтение (GET)** | Next.js API Routes + Server Components | Прямой `fetch` в Server Components для большинства страниц. API Routes — для внешних потребителей, поиска, экспорта. |
| **Файлы** | Supabase Storage | Изображения справочников, загружаемые документы (сметы, акты). RLS-политики на bucket'ах. |
| **Валидация** | Zod | Типобезопасная валидация на границах: Server Actions, API Routes. Схемы — источник истины для типов. |
| **Кэширование** | Next.js built-in + `revalidatePath`/`revalidateTag` | Минимальный подход: инвалидация кэша после мутаций. Redis на старте не нужен. |

### Почему не альтернативы

| Отвергнутый вариант | Причина |
|---|---|
| **Prisma** | Тяжелее Drizzle, кодогенерация добавляет сложность, холодный старт на Vercel медленнее. |
| **REST API (отдельный)** | Избыточно для внутреннего использования. Server Actions покрывают все мутации, API Routes — только GET. |
| **MongoDB** | Смета — реляционная предметная область. Связей больше, чем документов. |
| **NextAuth.js** | Supabase Auth даёт больше из коробки: хранение пользователей, RLS, миграции учётных записей. |
| **tRPC** | Добавляет слой абстракции. Server Actions проще для форм и решают ту же задачу. |
| **GraphQL** | Избыточно. Формат данных фиксирован, проблемы over-fetching для внутреннего использования нет. |

---

## 2. Схема базы данных

### 2.1 Общие правила

- Все первичные ключи — `UUID` (генерируются через `uuid_generate_v4()`).
- Все таблицы имеют `created_at` и `updated_at` (тип `timestamptz`, автоматически).
- Мягкое удаление (soft delete) — поле `deleted_at` (тип `timestamptz`, nullable). Реальное удаление — только для тестовых/запущенных данных.
- Денежные значения — `numeric(12,2)` (копейки важны в сметах).
- Названия таблиц — `snake_case` в БД, `camelCase` в Drizzle-схемах.

### 2.2 Полная схема

#### 2.2.1 `profiles` — Пользователи (расширение Supabase Auth)

Учётные записи управляются Supabase Auth автоматически (`auth.users`). Таблица `profiles` — публичная проекция с дополнительными полями.

```
TABLE public.profiles
─────────────────────────────────────────────────────────
Колонка          Тип                Null    Описание
─────────────────────────────────────────────────────────
id               uuid               PK      → auth.users.id
full_name        text               NOT     Отображаемое имя
avatar_url       text               YES     URL аватара (Supabase Storage)
workspace_name   text               YES     Название организации / рабочего пространства
workspace_logo   text               YES     URL логотипа
phone            text               YES     Телефон
position         text               YES     Должность
created_at       timestamptz        NOT     DEFAULT now()
updated_at       timestamptz        NOT     DEFAULT now()
─────────────────────────────────────────────────────────
PK:  id
FK:  id → auth.users.id ON DELETE CASCADE
RLS: пользователь читает/редактирует только свою запись.
     owner/admin читают все, manager — свою команду.
```

#### 2.2.2 `projects` — Проекты

```
TABLE public.projects
───────────────────────────────────────────────────────────
Колонка             Тип               Null     Описание
───────────────────────────────────────────────────────────
id                  uuid              PK
title               text              NOT      Название проекта
status              project_status    NOT      'new' | 'in_progress' | 'completed'
progress            integer           NOT      DEFAULT 0 (0–100)
customer            text              NOT      Название заказчика (текст)
counterparty_id     uuid              YES      → directory_counterparties.id
address             text              YES      Адрес объекта
budget              numeric(12,2)     YES      Бюджет проекта
start_date          date              YES      Дата начала
end_date            date              YES      Плановая дата окончания
owner_id            uuid              NOT      → profiles.id (создатель)
created_at          timestamptz       NOT      DEFAULT now()
updated_at          timestamptz       NOT      DEFAULT now()
deleted_at          timestamptz       YES      Soft delete
───────────────────────────────────────────────────────────
PK:  id
FK:  counterparty_id → directory_counterparties.id ON DELETE SET NULL
FK:  owner_id → profiles.id ON DELETE CASCADE
IDX: idx_projects_status        ON (status)
IDX: idx_projects_owner_id      ON (owner_id)
IDX: idx_projects_deleted_at    ON (deleted_at) WHERE deleted_at IS NULL
ENUM: project_status = ('new', 'in_progress', 'completed')
RLS:  owner + admin + manager — полный доступ.
      estimator + viewer — только чтение.
```

#### 2.2.3 `estimates` — Сметы

```
TABLE public.estimates
───────────────────────────────────────────────────────────
Колонка            Тип                Null     Описание
───────────────────────────────────────────────────────────
id                 uuid               PK
project_id         uuid               NOT      → projects.id
title              text               NOT      Название сметы
number             text               YES      Номер сметы (например, «СМ-01»)
status             estimate_status    NOT      DEFAULT 'draft'
total_materials    numeric(12,2)      YES      Итого материалы (вычисляемое)
total_works        numeric(12,2)      YES      Итого работы (вычисляемое)
total_amount       numeric(12,2)      YES      Итого по смете (вычисляемое)
notes              text               YES      Примечания
template_id        uuid               YES      → templates.id (если создана из шаблона)
created_by         uuid               NOT      → profiles.id
created_at         timestamptz        NOT      DEFAULT now()
updated_at         timestamptz        NOT      DEFAULT now()
deleted_at         timestamptz        YES      Soft delete
───────────────────────────────────────────────────────────
PK:  id
FK:  project_id → projects.id ON DELETE CASCADE
FK:  template_id → templates.id ON DELETE SET NULL
FK:  created_by → profiles.id ON DELETE CASCADE
IDX: idx_estimates_project_id   ON (project_id)
IDX: idx_estimates_status       ON (status)
ENUM: estimate_status = ('draft', 'approved', 'in_work', 'completed', 'cancelled')
RLS:  через проект (владелец проекта + owner + admin + manager — полный доступ; estimator + viewer — чтение).
```

#### 2.2.4 `estimate_works` — Работы в смете

```
TABLE public.estimate_works
───────────────────────────────────────────────────────────
Колонка               Тип              Null     Описание
───────────────────────────────────────────────────────────
id                    uuid             PK
estimate_id           uuid             NOT      → estimates.id
number                text             NOT      Номер по порядку (1, 2, 3… или «1.1»)
title                 text             NOT      Наименование работы
unit                  text             NOT      Ед. измерения (м², м³, шт, компл)
quantity              numeric(10,3)    NOT      Количество
price                 numeric(12,2)    NOT      Цена за единицу
total                 numeric(12,2)    NOT      Сумма (qty × price) — храним для скорости
directory_work_id     uuid             YES      → directory_works.id (справочник)
sort_order            integer          NOT      DEFAULT 0
created_at            timestamptz      NOT      DEFAULT now()
updated_at            timestamptz      NOT      DEFAULT now()
───────────────────────────────────────────────────────────
PK:  id
FK:  estimate_id → estimates.id ON DELETE CASCADE
FK:  directory_work_id → directory_works.id ON DELETE SET NULL
IDX: idx_estimate_works_estimate_id  ON (estimate_id)
RLS:  через смету → проект.
```

#### 2.2.5 `estimate_materials` — Материалы работы

```
TABLE public.estimate_materials
───────────────────────────────────────────────────────────
Колонка                  Тип             Null     Описание
───────────────────────────────────────────────────────────
id                       uuid            PK
estimate_work_id         uuid            NOT      → estimate_works.id
title                    text            NOT      Наименование материала
unit                     text            NOT      Ед. измерения
quantity                 numeric(10,3)   NOT      Количество
waste                    numeric(5,2)    NOT      DEFAULT 0 — процент отхода
price                    numeric(12,2)   NOT      Цена за единицу
total                    numeric(12,2)   NOT      Сумма (qty × price × (1+waste/100))
directory_material_id    uuid            YES      → directory_materials.id
sort_order               integer         NOT      DEFAULT 0
created_at               timestamptz     NOT      DEFAULT now()
updated_at               timestamptz     NOT      DEFAULT now()
───────────────────────────────────────────────────────────
PK:  id
FK:  estimate_work_id → estimate_works.id ON DELETE CASCADE
FK:  directory_material_id → directory_materials.id ON DELETE SET NULL
IDX: idx_estimate_materials_work_id  ON (estimate_work_id)
RLS:  через работу → смету → проект.
```

#### 2.2.6 `purchases` — Закупки (внутри сметы)

```
TABLE public.purchases
───────────────────────────────────────────────────────────
Колонка             Тип               Null     Описание
───────────────────────────────────────────────────────────
id                  uuid              PK
estimate_id         uuid              NOT      → estimates.id
title               text              NOT      Наименование закупки
plan_quantity       numeric(10,3)     NOT      Плановое количество
plan_price          numeric(12,2)     NOT      Плановая цена за единицу
fact_quantity       numeric(10,3)     YES      Фактическое количество
fact_price          numeric(12,2)     YES      Фактическая цена за единицу
unit                text              NOT      Ед. измерения
supplier_id         uuid              YES      → directory_suppliers.id
status              purchase_status   NOT      DEFAULT 'planned'
notes               text              YES      Примечания
created_at          timestamptz       NOT      DEFAULT now()
updated_at          timestamptz       NOT      DEFAULT now()
───────────────────────────────────────────────────────────
PK:  id
FK:  estimate_id → estimates.id ON DELETE CASCADE
FK:  supplier_id → directory_suppliers.id ON DELETE SET NULL
IDX: idx_purchases_estimate_id  ON (estimate_id)
IDX: idx_purchases_status       ON (status)
ENUM: purchase_status = ('planned', 'ordered', 'partially_received', 'received', 'cancelled')
RLS:  через смету → проект.
```

#### 2.2.7 `executions` — Выполнение (внутри сметы)

```
TABLE public.executions
───────────────────────────────────────────────────────────
Колонка             Тип               Null     Описание
───────────────────────────────────────────────────────────
id                  uuid              PK
estimate_id         uuid              NOT      → estimates.id
title               text              NOT      Наименование этапа/работы
unit                text              NOT      Ед. измерения
plan_quantity       numeric(10,3)     NOT      Плановый объём
plan_price          numeric(12,2)     NOT      Плановая цена за единицу
fact_quantity       numeric(10,3)     YES      Фактический объём
fact_price          numeric(12,2)     YES      Фактическая цена за единицу
status              execution_status  NOT      DEFAULT 'planned'
start_date          date              YES      Дата начала выполнения
end_date            date              YES      Дата окончания
notes               text              YES      Примечания
created_at          timestamptz       NOT      DEFAULT now()
updated_at          timestamptz       NOT      DEFAULT now()
───────────────────────────────────────────────────────────
PK:  id
FK:  estimate_id → estimates.id ON DELETE CASCADE
IDX: idx_executions_estimate_id  ON (estimate_id)
IDX: idx_executions_status       ON (status)
ENUM: execution_status = ('planned', 'in_progress', 'completed', 'delayed')
RLS:  через смету → проект.
```

#### 2.2.8 `global_purchases` — Глобальные закупки

Не привязаны к конкретной смете. Используются для планирования общих закупок по нескольким проектам.

```
TABLE public.global_purchases
───────────────────────────────────────────────────────────
Колонка             Тип               Null     Описание
───────────────────────────────────────────────────────────
id                  uuid              PK
title               text              NOT      Наименование
unit                text              NOT      Ед. измерения
plan_quantity       numeric(10,3)     NOT      Плановое количество
plan_price          numeric(12,2)     NOT      Плановая цена за единицу
fact_quantity       numeric(10,3)     YES      Фактическое количество
fact_price          numeric(12,2)     YES      Фактическая цена за единицу
supplier_id         uuid              YES      → directory_suppliers.id
status              purchase_status   NOT      DEFAULT 'planned'
notes               text              YES      Примечания
created_by          uuid              NOT      → profiles.id
created_at          timestamptz       NOT      DEFAULT now()
updated_at          timestamptz       NOT      DEFAULT now()
deleted_at          timestamptz       YES      Soft delete
───────────────────────────────────────────────────────────
PK:  id
FK:  supplier_id → directory_suppliers.id ON DELETE SET NULL
FK:  created_by → profiles.id ON DELETE CASCADE
IDX: idx_global_purchases_status  ON (status)
ENUM: purchase_status — см. таблицу purchases
RLS:  owner + admin + manager — полный доступ. estimator + viewer — чтение.
```

#### 2.2.9 `directory_materials` — Справочник материалов

```
TABLE public.directory_materials
───────────────────────────────────────────────────────────
Колонка          Тип                Null     Описание
───────────────────────────────────────────────────────────
id               uuid               PK
title            text               NOT      Наименование
unit             text               NOT      Ед. измерения
price            numeric(12,2)      NOT      Базовая цена
image_url        text               YES      URL изображения (Supabase Storage)
category         text               YES      Категория (например, «Бетон», «Кирпич»)
created_by       uuid               NOT      → profiles.id
created_at       timestamptz        NOT      DEFAULT now()
updated_at       timestamptz        NOT      DEFAULT now()
deleted_at       timestamptz        YES      Soft delete
───────────────────────────────────────────────────────────
PK:  id
FK:  created_by → profiles.id ON DELETE CASCADE
IDX: idx_dir_materials_category  ON (category)
IDX: idx_dir_materials_title     ON (title) — для поиска
RLS:  все аутентифицированные пользователи — чтение.
      owner + admin + manager — запись.
```

#### 2.2.10 `directory_works` — Справочник работ

```
TABLE public.directory_works
───────────────────────────────────────────────────────────
Колонка          Тип                Null     Описание
───────────────────────────────────────────────────────────
id               uuid               PK
title            text               NOT      Наименование работы
unit             text               NOT      Ед. измерения
rate             numeric(12,2)      NOT      Расценка
category         text               YES      Категория
created_by       uuid               NOT      → profiles.id
created_at       timestamptz        NOT      DEFAULT now()
updated_at       timestamptz        NOT      DEFAULT now()
deleted_at       timestamptz        YES      Soft delete
───────────────────────────────────────────────────────────
PK:  id
FK:  created_by → profiles.id ON DELETE CASCADE
IDX: idx_dir_works_category  ON (category)
IDX: idx_dir_works_title     ON (title) — для поиска
RLS:  все аутентифицированные пользователи — чтение.
      owner + admin + manager — запись.
```

#### 2.2.11 `directory_suppliers` — Справочник поставщиков

```
TABLE public.directory_suppliers
───────────────────────────────────────────────────────────
Колонка          Тип                Null     Описание
───────────────────────────────────────────────────────────
id               uuid               PK
name             text               NOT      Название / ФИО
color            text               YES      Цвет для UI (hex, например «#FF5733»)
status           supplier_status    NOT      'juridical' | 'individual'
inn              text               YES      ИНН
phone            text               YES      Телефон
email            text               YES      Email
address          text               YES      Адрес
notes            text               YES      Примечания
created_by       uuid               NOT      → profiles.id
created_at       timestamptz        NOT      DEFAULT now()
updated_at       timestamptz        NOT      DEFAULT now()
deleted_at       timestamptz        YES      Soft delete
───────────────────────────────────────────────────────────
PK:  id
FK:  created_by → profiles.id ON DELETE CASCADE
ENUM: supplier_status = ('juridical', 'individual')
IDX: idx_dir_suppliers_name  ON (name)
RLS:  все аутентифицированные пользователи — чтение.
      owner + admin + manager — запись.
```

#### 2.2.12 `directory_counterparties` — Справочник контрагентов

```
TABLE public.directory_counterparties
───────────────────────────────────────────────────────────
Колонка          Тип                Null     Описание
───────────────────────────────────────────────────────────
id               uuid               PK
name             text               NOT      Название / ФИО
type             counterparty_type  NOT      'customer' | 'contractor'
legal_status     legal_status       NOT      'juridical' | 'individual'
inn              text               YES      ИНН
phone            text               YES      Телефон
email            text               YES      Email
legal_address    text               YES      Юридический адрес (для юрлиц)
bank_details     jsonb              YES      Банковские реквизиты (для юрлиц)
                                            { bankName, bik, corrAccount, accountNumber }
passport         jsonb              YES      Паспортные данные (для физлиц)
                                            { series, number, issuedBy, issueDate, departmentCode, registrationAddress }
notes            text               YES      Примечания
created_by       uuid               NOT      → profiles.id
created_at       timestamptz        NOT      DEFAULT now()
updated_at       timestamptz        NOT      DEFAULT now()
deleted_at       timestamptz        YES      Soft delete
───────────────────────────────────────────────────────────
PK:  id
FK:  created_by → profiles.id ON DELETE CASCADE
ENUM: counterparty_type = ('customer', 'contractor')
ENUM: legal_status = ('juridical', 'individual')
IDX: idx_dir_counterparties_name  ON (name)
IDX: idx_dir_counterparties_type  ON (type)
IDX: idx_dir_counterparties_bank  ON (bank_details) — GIN-index для поиска по JSONB
RLS:  все аутентифицированные пользователи — чтение.
      owner + admin + manager — запись.
```

**Почему JSONB:** Типы `BankDetails` и `PassportData` в коде (`types/directory-counterparty.ts`) — структурированные объекты с подполями. JSONB сохраняет структуру без потерь, поддерживает индексацию (GIN) и запросы по вложенным полям (`bank_details->>'bik'`), в отличие от `text`-сериализации.

#### 2.2.13 `templates` — Шаблоны смет

```
TABLE public.templates
───────────────────────────────────────────────────────────
Колонка          Тип                Null     Описание
───────────────────────────────────────────────────────────
id               uuid               PK
title            text               NOT      Название шаблона
description      text               YES      Описание
category         text               YES      Категория шаблона
created_by       uuid               NOT      → profiles.id
created_at       timestamptz        NOT      DEFAULT now()
updated_at       timestamptz        NOT      DEFAULT now()
deleted_at       timestamptz        YES      Soft delete
───────────────────────────────────────────────────────────
PK:  id
FK:  created_by → profiles.id ON DELETE CASCADE
IDX: idx_templates_category  ON (category)
RLS:  все аутентифицированные пользователи — чтение.
      owner + admin + manager — запись.
```

#### 2.2.14 `template_works` — Работы шаблона

```
TABLE public.template_works
───────────────────────────────────────────────────────────
Колонка               Тип              Null     Описание
───────────────────────────────────────────────────────────
id                    uuid             PK
template_id           uuid             NOT      → templates.id
number                text             NOT      Номер по порядку
title                 text             NOT      Наименование работы
unit                  text             NOT      Ед. измерения
quantity              numeric(10,3)    NOT      Количество (обычно 0, заполняется при использовании)
price                 numeric(12,2)    NOT      Цена за единицу
directory_work_id     uuid             YES      → directory_works.id
sort_order            integer          NOT      DEFAULT 0
created_at            timestamptz      NOT      DEFAULT now()
updated_at            timestamptz      NOT      DEFAULT now()
───────────────────────────────────────────────────────────
PK:  id
FK:  template_id → templates.id ON DELETE CASCADE
FK:  directory_work_id → directory_works.id ON DELETE SET NULL
IDX: idx_template_works_template_id  ON (template_id)
```

#### 2.2.15 `template_materials` — Материалы шаблона

```
TABLE public.template_materials
───────────────────────────────────────────────────────────
Колонка                  Тип             Null     Описание
───────────────────────────────────────────────────────────
id                       uuid            PK
template_work_id         uuid            NOT      → template_works.id
title                    text            NOT      Наименование материала
unit                     text            NOT      Ед. измерения
quantity                 numeric(10,3)   NOT      Количество
waste                    numeric(5,2)    NOT      DEFAULT 0
price                    numeric(12,2)   NOT      Цена за единицу
directory_material_id    uuid            YES      → directory_materials.id
sort_order               integer         NOT      DEFAULT 0
created_at               timestamptz     NOT      DEFAULT now()
updated_at               timestamptz     NOT      DEFAULT now()
───────────────────────────────────────────────────────────
PK:  id
FK:  template_work_id → template_works.id ON DELETE CASCADE
FK:  directory_material_id → directory_materials.id ON DELETE SET NULL
IDX: idx_template_materials_work_id  ON (template_work_id)
```

#### 2.2.16 RBAC — Роли и разрешения

Модель RBAC соответствует коду `features/access-control/types.ts`: 5 ролей, 19 гранулярных пермишенов в 5 группах.

```
TABLE public.roles
───────────────────────────────────────────────────────────
Колонка          Тип                Null     Описание
───────────────────────────────────────────────────────────
id               uuid               PK
name             text               NOT      UNIQUE — 'owner', 'admin', 'manager', 'estimator', 'viewer'
label            text               NOT      Отображаемое имя на русском
locked           boolean            NOT      DEFAULT false — нельзя удалить (owner)
description      text               YES
created_at       timestamptz        NOT      DEFAULT now()
───────────────────────────────────────────────────────────
PK:  id
UQ:  name
Seed-данные (5 ролей):
  - owner      (Владелец)      — locked: true  — полный доступ, не может быть понижен
  - admin      (Администратор) — locked: false — полный доступ (кроме billing.manage)
  - manager    (Менеджер)      — locked: false — управление проектами/сметами/закупками
  - estimator  (Сметчик)       — locked: false — чтение проектов, полный доступ к сметам
  - viewer     (Наблюдатель)   — locked: false — только чтение

TABLE public.permissions
───────────────────────────────────────────────────────────
Колонка          Тип                Null     Описание
───────────────────────────────────────────────────────────
id               uuid               PK
key              text               NOT      UNIQUE — 'projects.read', 'projects.create', …
label            text               NOT      Отображаемое имя на русском
group_name       text               NOT      Группа: 'projects' | 'estimates' | 'purchases' | 'team' | 'billing'
description      text               YES
created_at       timestamptz        NOT      DEFAULT now()
───────────────────────────────────────────────────────────
PK:  id
UQ:  key
IDX: idx_permissions_group ON (group_name)

Seed-данные (19 пермишенов):

| key                  | label                          | group      |
|----------------------|--------------------------------|------------|
| projects.read        | Просмотр проектов              | projects   |
| projects.create      | Создание проектов              | projects   |
| projects.update      | Редактирование проектов        | projects   |
| projects.delete      | Удаление проектов              | projects   |
| estimates.read       | Просмотр смет                  | estimates  |
| estimates.create     | Создание смет                  | estimates  |
| estimates.update     | Редактирование смет            | estimates  |
| estimates.delete     | Удаление смет                  | estimates  |
| purchases.read       | Просмотр закупок               | purchases  |
| purchases.create     | Создание закупок               | purchases  |
| purchases.update     | Редактирование закупок         | purchases  |
| purchases.delete     | Удаление закупок               | purchases  |
| team.read            | Просмотр команды               | team       |
| team.create          | Приглашение участников         | team       |
| team.update          | Редактирование ролей           | team       |
| team.delete          | Удаление участников            | team       |
| team.manage          | Управление командой            | team       |
| billing.read         | Просмотр биллинга              | billing    |
| billing.manage       | Управление биллингом           | billing    |

TABLE public.role_permissions
───────────────────────────────────────────────────────────
Колонка          Тип                Null     Описание
───────────────────────────────────────────────────────────
role_id          uuid               NOT      → roles.id
permission_id    uuid               NOT      → permissions.id
───────────────────────────────────────────────────────────
PK:  (role_id, permission_id)
FK:  role_id → roles.id ON DELETE CASCADE
FK:  permission_id → permissions.id ON DELETE CASCADE

TABLE public.user_roles
───────────────────────────────────────────────────────────
Колонка          Тип                Null     Описание
───────────────────────────────────────────────────────────
user_id          uuid               NOT      → profiles.id
role_id          uuid               NOT      → roles.id
assigned_by      uuid               YES      → profiles.id (кто назначил)
created_at       timestamptz        NOT      DEFAULT now()
───────────────────────────────────────────────────────────
PK:  (user_id, role_id)
FK:  user_id → profiles.id ON DELETE CASCADE
FK:  role_id → roles.id ON DELETE CASCADE
FK:  assigned_by → profiles.id ON DELETE SET NULL
IDX: idx_user_roles_user_id  ON (user_id)
```

**Матрица RBAC (роль × разрешение):**

| Разрешение (key)     | owner | admin | manager | estimator | viewer |
|----------------------|:-----:|:-----:|:-------:|:---------:|:------:|
| projects.read        |   ✓   |   ✓   |    ✓    |     ✓     |   ✓    |
| projects.create      |   ✓   |   ✓   |    ✓    |     —     |   —    |
| projects.update      |   ✓   |   ✓   |    ✓    |     —     |   —    |
| projects.delete      |   ✓   |   ✓   |    —    |     —     |   —    |
| estimates.read       |   ✓   |   ✓   |    ✓    |     ✓     |   ✓    |
| estimates.create     |   ✓   |   ✓   |    ✓    |     ✓     |   —    |
| estimates.update     |   ✓   |   ✓   |    ✓    |     ✓     |   —    |
| estimates.delete     |   ✓   |   ✓   |    ✓    |     —     |   —    |
| purchases.read       |   ✓   |   ✓   |    ✓    |     ✓     |   ✓    |
| purchases.create     |   ✓   |   ✓   |    ✓    |     —     |   —    |
| purchases.update     |   ✓   |   ✓   |    ✓    |     —     |   —    |
| purchases.delete     |   ✓   |   ✓   |    —    |     —     |   —    |
| team.read            |   ✓   |   ✓   |    ✓    |     —     |   —    |
| team.create          |   ✓   |   ✓   |    —    |     —     |   —    |
| team.update          |   ✓   |   ✓   |    —    |     —     |   —    |
| team.delete          |   ✓   |   ✓   |    —    |     —     |   —    |
| team.manage          |   ✓   |   ✓   |    —    |     —     |   —    |
| billing.read         |   ✓   |   ✓   |    —    |     —     |   —    |
| billing.manage       |   ✓   |   —    |    —    |     —     |   —    |

#### 2.2.17a `workspace_members` — Участники workspace

Таблица связывает пользователей с их workspace и определяет роль участника. Использует те же роли, что и RBAC-система (`roles.name`). Поля `status`, `joined_at`, `last_active_at` расширяют контекст участника.

```
TABLE public.workspace_members
───────────────────────────────────────────────────────────
Колонка          Тип                Null     Описание
───────────────────────────────────────────────────────────
user_id          uuid               PK       → profiles.id (участник)
owner_id         uuid               NOT      → profiles.id (владелец workspace)
role             text               NOT      → roles.name
status           member_status      NOT      DEFAULT 'active' — 'active' | 'invited' | 'suspended'
joined_at        timestamptz        NOT      DEFAULT now()
last_active_at   timestamptz        YES      Последняя активность
created_at       timestamptz        NOT      DEFAULT now()
updated_at       timestamptz        NOT      DEFAULT now()
───────────────────────────────────────────────────────────
PK:  (user_id, owner_id)
FK:  user_id → profiles.id ON DELETE CASCADE
FK:  owner_id → profiles.id ON DELETE CASCADE
ENUM: member_status = ('active', 'invited', 'suspended')
IDX: idx_workspace_members_owner_id ON (owner_id)
IDX: idx_workspace_members_status ON (status)
RLS:  owner + admin — чтение и управление. Остальные — только чтение своей записи.
```

**Примечание:** `owner_id` определяет принадлежность к workspace — workspace идентифицируется по владельцу (`profiles.id`), чей `workspace_name` используется как название workspace. В будущем при выделении таблицы `workspaces` поле `owner_id` заменится на `workspace_id`.

#### 2.2.17b `workspace_invitations` — Приглашения в workspace

Хранит отправленные, но ещё не принятые приглашения. После регистрации пользователя запись удаляется и создаётся запись в `workspace_members`.

```
TABLE public.workspace_invitations
───────────────────────────────────────────────────────────
Колонка          Тип                Null     Описание
───────────────────────────────────────────────────────────
id               uuid               PK
email            text               NOT      Email приглашаемого
role             text               NOT      → roles.name
invited_by       uuid               NOT      → profiles.id (кто пригласил)
owner_id         uuid               NOT      → profiles.id (владелец workspace)
invited_at       timestamptz        NOT      DEFAULT now()
expires_at       timestamptz        NOT      DEFAULT (now() + interval '7 days')
status           invitation_status  NOT      DEFAULT 'pending' — 'pending' | 'expired'
created_at       timestamptz        NOT      DEFAULT now()
───────────────────────────────────────────────────────────
PK:  id
FK:  invited_by → profiles.id ON DELETE CASCADE
FK:  owner_id → profiles.id ON DELETE CASCADE
UQ:  (email, owner_id) — один email не может быть приглашён дважды в один workspace
ENUM: invitation_status = ('pending', 'expired')
IDX: idx_invitations_status ON (status)
IDX: idx_invitations_expires ON (expires_at) WHERE status = 'pending'
RLS:  owner + admin — полный доступ. manager — чтение.
```

#### 2.2.17c `workspace_allowed_domains` — Разрешённые домены

Белый список доменов для автоматического присоединения к workspace.

```
TABLE public.workspace_allowed_domains
───────────────────────────────────────────────────────────
Колонка          Тип                Null     Описание
───────────────────────────────────────────────────────────
id               uuid               PK
domain           text               NOT      Домен (например, «smetalabs.ru»)
owner_id         uuid               NOT      → profiles.id (владелец workspace)
added_by         uuid               NOT      → profiles.id (кто добавил)
added_at         timestamptz        NOT      DEFAULT now()
created_at       timestamptz        NOT      DEFAULT now()
───────────────────────────────────────────────────────────
PK:  id
FK:  owner_id → profiles.id ON DELETE CASCADE
FK:  added_by → profiles.id ON DELETE CASCADE
UQ:  (domain, owner_id)
IDX: idx_allowed_domains_owner ON (owner_id)
RLS:  owner + admin — полный доступ. manager — чтение.
```

**Примечания к матрице:**
- `owner` имеет все права и не может быть понижен (`locked: true`).
- `admin` имеет все права, кроме `billing.manage` (только owner управляет биллингом). Администратор может управлять командой (`team.manage`).
- `manager` управляет проектами, сметами, закупками; видит команду, но не управляет.
- `estimator` работает со сметами (создание/редактирование/удаление), видит проекты и закупки.
- `viewer` — только чтение проектов, смет, закупок.

#### 2.2.17 `user_settings` — Настройки аккаунта

Подход: JSONB-поддокументы для каждой группы настроек. **Публичная идентичность** (displayName, phone, email, workspaceName) хранится в `profiles` (см. 2.2.1) и **не дублируется** здесь. `user_settings` содержит только то, чего нет в `profiles`.

API (`GET /api/settings`) объединяет данные из `profiles` + `user_settings` в единый ответ.
Server Actions (`updateProfile`, `updateWorkspace`) разделяют данные: публичные поля → `profiles`, настройки → `user_settings`.

```
TABLE public.user_settings
───────────────────────────────────────────────────────────
Колонка                   Тип            Null     Описание
───────────────────────────────────────────────────────────
user_id                   uuid           PK       → profiles.id
profile                   jsonb          NOT      DEFAULT '{}' — дополнение к profiles
                                                     { language, timezone }
                                                     (displayName, email, phone, jobTitle — в profiles)
workspace                 jsonb          NOT      DEFAULT '{}' — юридические реквизиты
                                                     { companyLegalName, companyType,
                                                       registrationNumber, taxNumber, legalAddress,
                                                       billingEmail, companyPhone, defaultCurrency,
                                                       defaultLocale, defaultTimezone }
                                                     (workspaceName — в profiles.workspace_name)
preferences               jsonb          NOT      DEFAULT '{}' — AccountPreferences
                                                     { theme, density, dateFormat, numberFormat, defaultEstimateView }
notifications             jsonb          NOT      DEFAULT '{}' — NotificationSettings
                                                     { projectUpdates, estimateUpdates, procurementUpdates,
                                                       teamInvitations, billingNotifications, weeklySummary }
security                  jsonb          NOT      DEFAULT '{}' — SecurityInfo
                                                     { twoFactorEnabled, lastLogin, activeSessionsCount }
created_at                timestamptz    NOT      DEFAULT now()
updated_at                timestamptz    NOT      DEFAULT now()
───────────────────────────────────────────────────────────
PK:  user_id
FK:  user_id → profiles.id ON DELETE CASCADE
RLS:  пользователь читает/редактирует только свою запись.
```

**Почему JSONB, а не отдельные колонки:**
- Настройки загружаются и сохраняются целым документом (одна форма = один запрос).
- JSONB позволяет точное соответствие интерфейсам TypeScript без конвертации.
- Не нужно писать миграции при добавлении нового поля в настройки — достаточно расширить интерфейс.
- Поля `security.lastLogin` и `security.activeSessionsCount` — вычисляемые сервером, не редактируются пользователем.

**Разделение данных (нет дублирования с profiles):**

| Данные | Источник |
|---|---|
| displayName, phone, jobTitle | `profiles.full_name`, `.phone`, `.position` |
| email | `auth.users.email` (Supabase Auth) |
| workspaceName | `profiles.workspace_name` |
| language, timezone | `user_settings.profile` |
| Юр. реквизиты (companyLegalName, ...) | `user_settings.workspace` |
| preferences, notifications, security | `user_settings` |

**Значения по умолчанию (DEFAULT):**

```json
{
  "profile": {
    "language": "ru",
    "timezone": "UTC"
  },
  "workspace": {
    "companyLegalName": "",
    "companyType": "",
    "registrationNumber": "",
    "taxNumber": "",
    "legalAddress": "",
    "billingEmail": "",
    "companyPhone": "",
    "defaultCurrency": "RUB",
    "defaultLocale": "ru-RU",
    "defaultTimezone": "UTC"
  },
  "preferences": {
    "theme": "system",
    "density": "comfortable",
    "dateFormat": "DD.MM.YYYY",
    "numberFormat": "ru-RU",
    "defaultEstimateView": "table"
  },
  "notifications": {
    "projectUpdates": true,
    "estimateUpdates": true,
    "procurementUpdates": true,
    "teamInvitations": true,
    "billingNotifications": true,
    "weeklySummary": false
  },
  "security": {
    "twoFactorEnabled": false,
    "lastLogin": "",
    "activeSessionsCount": 0
  }
}
```

### 2.3 Row Level Security (RLS) — Базовые политики

RLS включается на всех публичных таблицах. Политики используют роль пользователя из JWT Supabase и таблицу `user_roles`.

```sql
-- Шаблон политик (применяется к каждой таблице)

-- 1. Включаем RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 2. Политики для projects (пример):
--    SELECT: владелец OR роль IN (owner, admin, manager, estimator, viewer)
--    INSERT/UPDATE/DELETE: владелец OR роль IN (owner, admin, manager)

-- Все политики используют:
--   auth.uid() — ID текущего пользователя
--   is_owner(), is_admin(), is_manager(), is_estimator(), is_viewer() — вспомогательные функции
```

**Вспомогательные SQL-функции:**

```sql
-- Проверка роли пользователя
CREATE OR REPLACE FUNCTION public.user_role(role_name text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = role_name
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean AS $$ SELECT public.user_role('owner'); $$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$ SELECT public.user_role('admin'); $$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean AS $$ SELECT public.user_role('manager'); $$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.is_estimator()
RETURNS boolean AS $$ SELECT public.user_role('estimator'); $$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.can_write()
RETURNS boolean AS $$
  SELECT public.is_owner() OR public.is_admin() OR public.is_manager();
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.can_read()
RETURNS boolean AS $$
  SELECT public.is_owner() OR public.is_admin() OR public.is_manager()
      OR public.is_estimator() OR public.is_viewer();
$$ LANGUAGE sql;
```

### 2.3.1 Workspace-подсистема (дополнительные связи)

```
profiles.id (owner) ◀── workspace_members.owner_id
profiles.id (owner) ◀── workspace_invitations.owner_id
profiles.id (owner) ◀── workspace_allowed_domains.owner_id

profiles.id (user)   ◀── workspace_members.user_id
profiles.id (invited_by) ◀── workspace_invitations.invited_by
profiles.id (added_by) ◀── workspace_allowed_domains.added_by
```

### 2.4 Диаграмма таблиц

```
┌─────────────────────┐
│     profiles        │  ← 1:1 → auth.users (Supabase)
│  (расширение auth)  │
└──────┬──────────────┘
       │ 1
       │
       ├──────────────────────────────────────────────────────────────┐
       │ 1:N                                           1:N            │ 1:1
       ▼                                                ▼              ▼
┌──────────────┐  ┌───────────────────────┐  ┌──────────────────────────┐
│   projects   │  │     directory_*       │  │     user_settings        │
│              │  │  (materials, works,   │  └──────────────────────────┘
│              │  │   suppliers,          │
│              │  │   counterparties)     │
└──────┬───────┘  └───────────────────────┘
       │ 1
       │
       ├──────────────────────────┐
       │ 1:N                      │ 1:N
       ▼                          ▼
┌──────────────┐          ┌──────────────┐
│  estimates   │          │  templates   │
│              │          │              │
└──────┬───────┘          └──────┬───────┘
       │ 1                      │ 1
       │                        │
       ├──────────┬───────────┐ ├──────────┐
       │ 1:N      │ 1:N       │ │ 1:N      │ 1:N
       ▼          ▼           ▼ ▼          ▼
┌────────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐
│ estimate_  │ │ purchases│ │executions│ │ template_      │
│ works      │ │          │ │          │ │ works          │
└──────┬─────┘ └──────────┘ └──────────┘ └───────┬────────┘
       │ 1                                       │ 1
       │ 1:N                                     │ 1:N
       ▼                                         ▼
┌──────────────────┐                   ┌──────────────────┐
│ estimate_        │                   │ template_        │
│ materials        │                   │ materials        │
└──────────────────┘                   └──────────────────┘


┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    roles     │────▶│role_permiss- │◀────│ permissions  │
│              │     │    ions      │     │              │
└──────┬───────┘     └──────────────┘     └──────────────┘
       │
       │ 1:N
       ▼
┌──────────────┐
│  user_roles  │◀──── profiles
└──────────────┘
       │
       │ 1:N
       ▼
┌────────────────────┐     ┌──────────────────────┐     ┌─────────────────────────┐
│ workspace_members  │     │ workspace_invitations│     │ workspace_allowed_      │
│  → profiles(user)  │     │  → profiles(inviter) │     │ domains                 │
│  → profiles(owner) │     │  → profiles(owner)   │     │  → profiles(added_by)   │
└────────────────────┘     └──────────────────────┘     │  → profiles(owner)      │
                                                        └─────────────────────────┘


┌────────────────────┐
│ global_purchases   │  (автономная — не привязана к проектам/сметам)
│  → suppliers       │
│  → created_by      │
└────────────────────┘
```

### 2.5 Связи справочников и рабочих таблиц

```
estimate_works.directory_work_id ────────▶ directory_works.id
    (ссылка на справочник — при добавлении работы из справочника)

estimate_materials.directory_material_id ▶ directory_materials.id
    (ссылка на справочник — при добавлении материала из справочника)

purchases.supplier_id ──────────────────▶ directory_suppliers.id
    (кто поставляет)

projects.counterparty_id ───────────────▶ directory_counterparties.id
    (заказчик проекта — ссылка на контрагента)

global_purchases.supplier_id ───────────▶ directory_suppliers.id
    (поставщик глобальной закупки)
```

---

## 3. API-дизайн

### 3.1 Архитектурный принцип

```
Мутации (POST/PUT/DELETE) → Server Actions (app/actions/)
Чтение (GET)              → API Routes (app/api/) + прямые запросы в Server Components
```

**Почему разделение:**

- **Server Actions** — идеальны для форм: прогрессивная деградация, типобезопасность от формы до БД, автоматическая защита от CSRF.
- **API Routes** — для внешних интеграций, поиска с query-параметрами, экспорта данных (CSV/XLSX), публичных эндпоинтов.
- **Прямые запросы в Server Components** — самый быстрый путь данных для страниц: нет лишнего HTTP-хопа.

### 3.2 Server Actions (мутации)

Все мутации — в `app/actions/`. Группировка по доменам:

```
app/actions/
  projects.ts            — createProject, updateProject, deleteProject
  estimates.ts           — createEstimate, updateEstimate, deleteEstimate
  estimate-works.ts      — createWork, updateWork, deleteWork, reorderWorks
  estimate-materials.ts  — createMaterial, updateMaterial, deleteMaterial
  purchases.ts           — createPurchase, updatePurchase, deletePurchase
  executions.ts          — createExecution, updateExecution, deleteExecution
  global-purchases.ts    — createGlobalPurchase, updateGlobalPurchase, deleteGlobalPurchase
  directories/
    materials.ts         — createDirMaterial, updateDirMaterial, deleteDirMaterial
    works.ts             — createDirWork, updateDirWork, deleteDirWork
    suppliers.ts         — createDirSupplier, updateDirSupplier, deleteDirSupplier
    counterparties.ts    — createDirCounterparty, updateDirCounterparty, deleteDirCounterparty
  templates.ts           — createTemplate, updateTemplate, deleteTemplate, applyTemplate
  access-control.ts      — assignRole, removeRole
  workspace-settings.ts  — inviteMember, removeMember, changeRole, suspendMember,
                            inviteByLink, revokeInvitation, addDomain, removeDomain,
                            leaveWorkspace, transferOwnership, archiveWorkspace, deleteWorkspace
  settings.ts            — updateProfile, updateWorkspace, updatePreferences,
                            updateNotifications, updateSecurity
  auth.ts                — кастомные действия (большинство — через Supabase Auth)
```

**Конвенция Server Action:**

```typescript
// Пример сигнатуры (Zod-валидация на входе)
'use server'

import { z } from 'zod'
import { db } from '@/db'
import { projects } from '@/db/schema/projects'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/supabase/server'

const CreateProjectSchema = z.object({
  title: z.string().min(1).max(200),
  customer: z.string().min(1).max(200),
  counterpartyId: z.string().uuid().optional(),
  address: z.string().optional(),
  budget: z.number().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export async function createProject(input: z.infer<typeof CreateProjectSchema>) {
  const { data: session } = await auth.getSession()
  if (!session) throw new Error('Unauthorized')

  const parsed = CreateProjectSchema.parse(input)
  // ... Drizzle insert ...
  revalidatePath('/projects')
  // return { id, ... }
}
```

### 3.3 API Routes (чтение)

```
GET  /api/projects                                  — список проектов (с фильтрами)
GET  /api/projects/:id                              — детали проекта
GET  /api/projects/:id/estimates                     — сметы проекта
GET  /api/estimates/:id                              — детали сметы
GET  /api/estimates/:id/works                        — работы сметы
GET  /api/estimates/:id/works/:workId/materials      — материалы работы
GET  /api/estimates/:id/purchases                    — закупки сметы
GET  /api/estimates/:id/executions                   — выполнение сметы
GET  /api/global-purchases                           — глобальные закупки
GET  /api/directory/materials                        — справочник материалов (с поиском)
GET  /api/directory/works                            — справочник работ (с поиском)
GET  /api/directory/suppliers                        — справочник поставщиков
GET  /api/directory/counterparties                   — справочник контрагентов
GET  /api/templates                                  — шаблоны смет
GET  /api/templates/:id                              — детали шаблона
GET  /api/dashboard/stats                            — статистика для дашборда
GET  /api/dashboard/projects-by-status               — проекты по статусам
GET  /api/dashboard/budget-summary                   — сводка по бюджетам
GET  /api/team                                       — список команды (участники workspace)
GET  /api/team/members                               — список участников с ролями и статусами
GET  /api/team/invitations                           — список ожидающих приглашений
GET  /api/team/domains                               — список разрешённых доменов
POST /api/team/invite                                — отправить приглашение
POST /api/team/invite-link                           — сгенерировать/обновить invite-ссылку
POST /api/team/members/:userId/change-role           — изменить роль участника
POST /api/team/members/:userId/suspend               — заблокировать участника
POST /api/team/members/:userId/remove                — удалить участника из workspace
POST /api/team/invitations/:id/revoke                — отозвать приглашение
POST /api/team/invitations/:id/resend                — повторно отправить приглашение
POST /api/team/domains/add                           — добавить разрешённый домен
POST /api/team/domains/:id/remove                    — удалить разрешённый домен
POST /api/team/transfer-ownership                    — передать права владельца
POST /api/team/leave                                 — покинуть workspace
POST /api/team/archive                               — архивировать workspace
POST /api/team/delete                                — удалить workspace
GET  /api/settings                                   — настройки текущего пользователя
GET  /api/access-control/roles                       — доступные роли и разрешения
```

**Стандартный формат ответа:**

```json
{
  "data": { "…": "…" },
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

Ошибки:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Проект не найден"
  }
}
```

### 3.4 Параметры фильтрации и поиска

Для списковых эндпоинтов:

| Параметр | Тип | Пример | Описание |
|---|---|---|---|
| `search` | string | `?search=бетон` | Полнотекстовый поиск по названию |
| `status` | string | `?status=in_progress` | Фильтр по статусу |
| `category` | string | `?category=Бетон` | Фильтр по категории |
| `sort` | string | `?sort=created_at` | Поле сортировки |
| `order` | string | `?order=desc` | Направление (asc / desc) |
| `page` | number | `?page=1` | Номер страницы |
| `pageSize` | number | `?pageSize=20` | Размер страницы |

---

## 4. Потоки данных

### 4.1 Страница (Server Component) — чтение

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐     ┌────────────┐
│  Браузер     │     │  Next.js Server  │     │   Drizzle    │     │ PostgreSQL │
│              │     │  Component       │     │   ORM        │     │ (Supabase) │
└──────┬───────┘     └────────┬─────────┘     └──────┬───────┘     └─────┬──────┘
       │                      │                      │                   │
       │  1. HTTP GET         │                      │                   │
       │  /projects           │                      │                   │
       │─────────────────────▶│                      │                   │
       │                      │                      │                   │
       │                      │  2. db.query.        │                   │
       │                      │     projects.        │                   │
       │                      │     findMany()       │                   │
       │                      │─────────────────────▶│                   │
       │                      │                      │                   │
       │                      │                      │  3. SELECT *      │
       │                      │                      │     FROM projects │
       │                      │                      │──────────────────▶│
       │                      │                      │                   │
       │                      │                      │  4. rows[]        │
       │                      │                      │◀──────────────────│
       │                      │                      │                   │
       │                      │  5. ProjectRow[]     │                   │
       │                      │◀─────────────────────│                   │
       │                      │                      │                   │
       │  6. HTML (RSC        │                      │                   │
       │     payload)         │                      │                   │
       │◀─────────────────────│                      │                   │
       │                      │                      │                   │
```

**Важно:** Страницы на Next.js App Router — Server Components по умолчанию. Данные запрашиваются на сервере при рендеринге. Нулевой bundle JS для данных.

### 4.2 Мутация (Client Component → Server Action)

```
┌──────────┐    ┌────────────┐    ┌──────────────┐    ┌──────────┐    ┌────────────┐
│ Браузер  │    │Server      │    │   Drizzle    │    │PostgreSQL│    │Next.js     │
│ (форма)  │    │Action      │    │   ORM        │    │          │    │Cache       │
└────┬─────┘    └─────┬──────┘    └──────┬───────┘    └────┬─────┘    └─────┬──────┘
     │                │                  │                 │                │
     │ 1. <form       │                  │                 │                │
     │    action={    │                  │                 │                │
     │    create      │                  │                 │                │
     │    Project}>   │                  │                 │                │
     │───────────────▶│                  │                 │                │
     │                │                  │                 │                │
     │                │ 2. Zod.validate  │                 │                │
     │                │    Проверка прав │                 │                │
     │                │                  │                 │                │
     │                │ 3. db.insert(    │                 │                │
     │                │    projects)     │                 │                │
     │                │    .values(...)  │                 │                │
     │                │─────────────────▶│                 │                │
     │                │                  │                 │                │
     │                │                  │ 4. INSERT INTO  │                │
     │                │                  │    projects     │                │
     │                │                  │────────────────▶│                │
     │                │                  │                 │                │
     │                │                  │ 5. OK           │                │
     │                │                  │◀────────────────│                │
     │                │                  │                 │                │
     │                │ 6. inserted row  │                 │                │
     │                │◀─────────────────│                 │                │
     │                │                  │                 │                │
     │                │ 7. revalidate-   │                 │                │
     │                │    Path('/       │                 │                │
     │                │    projects')    │                 │                │
     │                │───────────────────────────────────────────────────▶│
     │                │                  │                 │                │
     │  8. redirect   │                  │                 │                │
     │     или return │                  │                 │                │
     │◀───────────────│                  │                 │                │
     │                │                  │                 │                │
     │  9. revalidate — страница         │                 │                │
     │     перерендерится на сервере     │                 │                │
     │     с новыми данными              │                 │                │
```

### 4.3 Аутентификация (Supabase Auth)

```
┌──────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────┐
│ Браузер  │      │ Next.js      │      │ Supabase     │      │PostgreSQL│
│          │      │ Middleware    │      │ Auth         │      │          │
└────┬─────┘      └──────┬───────┘      └──────┬───────┘      └────┬─────┘
     │                   │                     │                   │
     │ 1. Логин/Регистр. │                     │                   │
     │    через UI       │                     │                   │
     │    Supabase       │                     │                   │
     │─────────────────────────────────────────▶                   │
     │                   │                     │                   │
     │                   │                     │ 2. Создать/       │
     │                   │                     │    проверить      │
     │                   │                     │    пользователя   │
     │                   │                     │──────────────────▶│
     │                   │                     │                   │
     │ 3. JWT + Refresh  │                     │                   │
     │    token в        │                     │                   │
     │    cookies        │                     │                   │
     │◀────────────────────────────────────────│                   │
     │                   │                     │                   │
     │ 4. Каждый запрос  │                     │                   │
     │    с cookie       │                     │                   │
     │──────────────────▶│                     │                   │
     │                   │                     │                   │
     │                   │ 5. middleware.ts    │                   │
     │                   │    проверяет JWT    │                   │
     │                   │    (supabase        │                   │
     │                   │     .auth.getUser)  │                   │
     │                   │                     │                   │
     │                   │ 6. PUBLIC routes:   │                   │
     │                   │    /auth/*          │                   │
     │                   │    ── пропуск       │                   │
     │                   │                     │                   │
     │                   │ 7. PROTECTED:       │                   │
     │                   │    всё остальное    │                   │
     │                   │    ── редирект на   │                   │
     │                   │       /auth/login   │                   │
     │                   │       если нет JWT  │                   │
     │                   │                     │                   │
     │                   │ 8. Server Component │                   │
     │                   │    / Server Action  │                   │
     │                   │    получает user из │                   │
     │                   │    cookies →        │                   │
     │                   │    auth.getSession()│                   │
     │                   │                     │                   │
     │                   │ 9. RLS в PostgreSQL │                   │
     │                   │    auth.uid()       │                   │
     │                   │    определяет       │                   │
     │                   │    доступ к строкам │                   │
```

**Middleware (`middleware.ts`):**

```typescript
// Защита роутов: публичные vs защищённые
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|auth).*)'],
}
```

### 4.4 Загрузка файлов (Supabase Storage)

```
┌──────────┐      ┌──────────────┐      ┌──────────────┐
│ Браузер  │      │ Server       │      │ Supabase     │
│ (форма)  │      │ Action       │      │ Storage      │
└────┬─────┘      └──────┬───────┘      └──────┬───────┘
     │                   │                     │
     │ 1. <input type=   │                     │
     │    file> + FormData│                    │
     │──────────────────▶│                     │
     │                   │                     │
     │                   │ 2. supabase.storage │
     │                   │    .from('materials')│
     │                   │    .upload(path,    │
     │                   │     file)           │
     │                   │────────────────────▶│
     │                   │                     │
     │                   │ 3. publicUrl        │
     │                   │◀────────────────────│
     │                   │                     │
     │                   │ 4. Сохраняем URL    │
     │                   │    в directory_     │
     │                   │    materials.       │
     │                   │    image_url        │
     │                   │                     │
     │  5. Результат     │                     │
     │◀──────────────────│                     │
```

---

## 5. План миграции с моков на реальные данные

### 5.1 Порядок миграции (по возрастанию зависимостей)

Миграция идёт от независимых сущностей к зависимым:

```
Фаза 1: Фундамент
  ├── 1.1 Supabase проект + переменные окружения
  ├── 1.2 Drizzle конфигурация (drizzle.config.ts)
  ├── 1.3 Схемы БД (db/schema/*)
  ├── 1.4 Миграции (db/migrations/)
  ├── 1.5 Seed-данные (db/seed.ts) — роли, разрешения
  └── 1.6 Supabase-клиенты (server/client) + middleware

Фаза 2: Аутентификация и workspace
  ├── 2.1 Supabase Auth UI (auth/login, signup, forgot-password)
  ├── 2.2 Middleware (защита роутов)
  ├── 2.3 Профиль (profiles таблица)
  ├── 2.4 User settings (user_settings)
  └── 2.5 Workspace management (workspace_members, workspace_invitations, workspace_allowed_domains)

Фаза 3: Справочники (независимые)
  ├── 3.1 directory_materials
  ├── 3.2 directory_works
  ├── 3.3 directory_suppliers
  └── 3.4 directory_counterparties

Фаза 4: Основные сущности
  ├── 4.1 Projects
  ├── 4.2 Estimates
  ├── 4.3 Estimate Works
  ├── 4.4 Estimate Materials
  ├── 4.5 Purchases
  └── 4.6 Executions

Фаза 5: Вспомогательные
  ├── 5.1 Global Purchases
  ├── 5.2 Templates + Template Works + Template Materials
  ├── 5.3 Workspace settings (миграция моков из features/workspace-settings)
  └── 5.4 RBAC (team management, user_roles)

Фаза 6: Дашборд и финальные штрихи
  ├── 6.1 API Routes для статистики
  ├── 6.2 Account Settings (миграция моков из features/account-settings)
  ├── 6.3 Workspace Settings (миграция моков из features/workspace-settings)
  └── 6.4 Access Control (миграция моков из features/access-control)
```

### 5.2 Что меняется в каждой фиче

#### Общий шаблон изменений

Для каждой фичи (например, `features/projects/`):

**Было (моки):**

```
features/projects/
  __mocks__/projects.ts          ← статические данные
  hooks/use-projects.ts          ← возвращает моки
  components/projects-view.tsx   ← использует useProjects()
  types/projects.ts              ← без изменений
```

**Стало (реальные данные):**

```
features/projects/
  hooks/use-projects.ts          ← переписан на fetch / Server Component
  components/projects-view.tsx   ← без изменений (интерфейс тот же)
  types/projects.ts              ← без изменений (те же типы)
  __mocks__/projects.ts          ← удалён или оставлен для тестов
```

#### Детальные изменения по фичам

| Фича | Хук меняется на | Server Actions | API Route (если нужно) |
|---|---|---|---|
| **Projects** | `useProjects` → Server Component + `db.query.projects.findMany()` | `createProject`, `updateProject`, `deleteProject` | `GET /api/projects` |
| **Project Details** | `useProject(id)` → Server Component | — (использует actions projects) | `GET /api/projects/:id` |
| **Estimates** | `useEstimates(projectId)` → Server Component | `createEstimate`, `updateEstimate`, `deleteEstimate` | `GET /api/projects/:id/estimates` |
| **Estimate Works** | `useEstimateWorks(estimateId)` → Server Component | `createWork`, `updateWork`, `deleteWork`, `reorderWorks` | `GET /api/estimates/:id/works` |
| **Estimate Materials** | `useEstimateMaterials(workId)` → Server Component | `createMaterial`, `updateMaterial`, `deleteMaterial` | `GET /api/estimates/:id/works/:workId/materials` |
| **Purchases** | `usePurchases(estimateId)` → Server Component | `createPurchase`, `updatePurchase`, `deletePurchase` | `GET /api/estimates/:id/purchases` |
| **Executions** | `useExecutions(estimateId)` → Server Component | `createExecution`, `updateExecution`, `deleteExecution` | `GET /api/estimates/:id/executions` |
| **Global Purchases** | `useGlobalPurchases()` → Server Component | `createGlobalPurchase`, `updateGlobalPurchase`, `deleteGlobalPurchase` | `GET /api/global-purchases` |
| **Dir. Materials** | `useDirectoryMaterials()` → Server Component | `createDirMaterial`, `updateDirMaterial`, `deleteDirMaterial` | `GET /api/directory/materials` |
| **Dir. Works** | `useDirectoryWorks()` → Server Component | `createDirWork`, `updateDirWork`, `deleteDirWork` | `GET /api/directory/works` |
| **Dir. Suppliers** | `useDirectorySuppliers()` → Server Component | `createDirSupplier`, `updateDirSupplier`, `deleteDirSupplier` | `GET /api/directory/suppliers` |
| **Dir. Counterparties** | `useDirectoryCounterparties()` → Server Component | `createDirCounterparty`, `updateDirCounterparty`, `deleteDirCounterparty` | `GET /api/directory/counterparties` |
| **Templates** | `useTemplates()` → Server Component | `createTemplate`, `updateTemplate`, `deleteTemplate`, `applyTemplate` | `GET /api/templates` |
| **Access Control** | `useTeam()` → Server Component | `assignRole`, `removeRole` | `GET /api/access-control/roles` |
| **Dashboard** | `useDashboardStats()` → Server Component | — (read-only) | `GET /api/dashboard/*` |
| **Workspace Settings** | `useWorkspaceSettings()` → Server Component | `inviteMember`, `removeMember`, `changeRole`, `suspendMember`, `revokeInvitation`, `addDomain`, `removeDomain`, `leaveWorkspace`, `transferOwnership`, `archiveWorkspace`, `deleteWorkspace` | `GET /api/team/*` |
| **Account Settings** | `useSettings()` → Server Component | `updateProfile`, `updateWorkspace`, `updatePreferences`, `updateNotifications`, `updateSecurity` | `GET /api/settings` |
| **Auth** | `useAuth()` → Supabase Auth хуки | SignIn, SignUp, ResetPassword | — |

### 5.3 Пример: миграция фичи Projects

```diff
features/projects/
  hooks/use-projects.ts
-   import { mockProjects } from '../__mocks__/projects'
-   export function useProjects() {
-     return { projects: mockProjects, isLoading: false, error: null }
-   }

+   'use server' — или становится не нужен (данные из Server Component)
+   import { db } from '@/db'
+   import { projects } from '@/db/schema/projects'
+   export async function getProjects() {
+     return db.query.projects.findMany({
+       where: eq(projects.deletedAt, null),
+       orderBy: desc(projects.createdAt),
+     })
+   }

  __mocks__/projects.ts
-   // Удаляется

  components/projects-view.tsx
    // Принимает projects как prop от Server Component
    // Интерфейс props не меняется, только источник данных
```

---

## 6. Структура проекта

Новые папки и файлы (добавляются к существующей структуре Next.js):

```
smetalab/
│
├── db/                              # 🆕 Слой базы данных
│   ├── schema/                      # Drizzle-схемы (одна таблица = один файл)
│   │   ├── index.ts                 #   Экспорт всех таблиц + relations
│   │   ├── profiles.ts              #   profiles (расширение auth.users)
│   │   ├── projects.ts             #   projects
│   │   ├── estimates.ts            #   estimates
│   │   ├── estimate-works.ts       #   estimate_works
│   │   ├── estimate-materials.ts   #   estimate_materials
│   │   ├── purchases.ts            #   purchases
│   │   ├── executions.ts           #   executions
│   │   ├── global-purchases.ts     #   global_purchases
│   │   ├── directory-materials.ts  #   directory_materials
│   │   ├── directory-works.ts      #   directory_works
│   │   ├── directory-suppliers.ts  #   directory_suppliers
│   │   ├── directory-counterparties.ts # directory_counterparties
│   │   ├── templates.ts            #   templates
│   │   ├── template-works.ts       #   template_works
│   │   ├── template-materials.ts   #   template_materials
│   │   ├── roles.ts                #   roles + permissions + role_permissions
│   │   ├── user-roles.ts           #   user_roles
│   │   ├── workspace-members.ts    #   workspace_members
│   │   ├── workspace-invitations.ts #  workspace_invitations
│   │   ├── workspace-allowed-domains.ts # workspace_allowed_domains
│   │   └── user-settings.ts        #   user_settings
│   │
│   ├── migrations/                  # Авто-генерируемые Drizzle миграции
│   │   ├── 0000_initial.sql
│   │   ├── 0001_add_soft_delete.sql
│   │   └── ...
│   │
│   ├── seed.ts                      # Начальные данные (роли, разрешения, admin-пользователь)
│   └── index.ts                     # Экспорт db-клиента (drizzle(client))
│
├── lib/                             # 🆕 Библиотеки и утилиты
│   ├── supabase/
│   │   ├── client.ts                #   Клиент для Client Components (browser)
│   │   ├── server.ts                #   Клиент для Server Components + Actions
│   │   ├── middleware.ts            #   Клиент для middleware
│   │   └── admin.ts                 #   Клиент с service_role (seed, миграции)
│   │
│   ├── auth/
│   │   ├── permissions.ts           #   Проверка прав (canManageProjects и т.д.)
│   │   ├── roles.ts                 #   Получение ролей пользователя
│   │   └── middleware.ts            #   Логика middleware (защита роутов)
│   │
│   ├── validators/                  # Zod-схемы валидации (общие для actions + API)
│   │   ├── projects.ts
│   │   ├── estimates.ts
│   │   ├── directories.ts
│   │   └── ...
│   │
│   └── utils/
│       ├── format.ts                #   Форматирование (деньги, даты)
│       └── csv-export.ts            #   Экспорт в CSV/XLSX
│
├── app/
│   ├── api/                         # 🆕 API Routes (GET — чтение)
│   │   ├── projects/
│   │   │   ├── route.ts             #   GET /api/projects
│   │   │   └── [id]/
│   │   │       ├── route.ts         #   GET /api/projects/:id
│   │   │       └── estimates/
│   │   │           └── route.ts     #   GET /api/projects/:id/estimates
│   │   ├── estimates/
│   │   │   └── [id]/
│   │   │       ├── route.ts         #   GET /api/estimates/:id
│   │   │       ├── works/
│   │   │       │   └── route.ts     #   GET /api/estimates/:id/works
│   │   │       ├── purchases/
│   │   │       │   └── route.ts     #   GET /api/estimates/:id/purchases
│   │   │       └── executions/
│   │   │           └── route.ts     #   GET /api/estimates/:id/executions
│   │   ├── global-purchases/
│   │   │   └── route.ts             #   GET /api/global-purchases
│   │   ├── directory/
│   │   │   ├── materials/route.ts
│   │   │   ├── works/route.ts
│   │   │   ├── suppliers/route.ts
│   │   │   └── counterparties/route.ts
│   │   ├── templates/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── dashboard/
│   │   │   ├── stats/route.ts
│   │   │   ├── projects-by-status/route.ts
│   │   │   └── budget-summary/route.ts
│   │   ├── team/
│   │   │   └── route.ts
│   │   ├── access-control/
│   │   │   └── roles/route.ts
│   │   └── settings/
│   │       └── route.ts
│   │
│   ├── actions/                     # 🆕 Server Actions (POST/PUT/DELETE)
│   │   ├── projects.ts
│   │   ├── estimates.ts
│   │   ├── estimate-works.ts
│   │   ├── estimate-materials.ts
│   │   ├── purchases.ts
│   │   ├── executions.ts
│   │   ├── global-purchases.ts
│   │   ├── directories/
│   │   │   ├── materials.ts
│   │   │   ├── works.ts
│   │   │   ├── suppliers.ts
│   │   │   └── counterparties.ts
│   │   ├── templates.ts
│   │   ├── access-control.ts
│   │   ├── workspace-settings.ts
│   │   └── settings.ts
│   │
│   └── auth/                        # Существующие страницы (будут обновлены)
│       ├── login/page.tsx           #   → Supabase Auth UI
│       ├── signup/page.tsx
│       └── forgot-password/page.tsx
│
├── features/                        # Существующая структура (будет обновлена)
│   ├── projects/                    #   Удалить __mocks__, обновить хуки
│   ├── estimates/                   #   Удалить __mocks__, обновить хуки
│   ├── directories/                 #   Удалить __mocks__, обновить хуки
│   ├── directory-materials/         #   Удалить __mocks__, обновить хуки
│   ├── directory-works/             #   Удалить __mocks__, обновить хуки
│   ├── directory-suppliers/         #   Удалить __mocks__, обновить хуки
│   ├── directory-counterparties/    #   Удалить __mocks__, обновить хуки
│   ├── purchases/                   #   Удалить __mocks__, обновить хуки
│   ├── execution/                   #   Удалить __mocks__, обновить хуки
│   ├── global-purchases/            #   Удалить __mocks__, обновить хуки
│   ├── procurements/                #   Удалить __mocks__, обновить хуки
│   ├── access-control/              #   Удалить __mocks__, обновить хуки
│   ├── account-settings/            #   Удалить __mocks__, обновить хуки
│   ├── workspace-settings/          #   Удалить __mocks__, обновить хуки
│   ├── dashboard/                   #   Обновить хуки
│   └── auth/                        #   Обновить хуки
│
├── drizzle.config.ts                # 🆕 Конфигурация Drizzle
├── .env.local                       # 🆕 Переменные окружения
└── middleware.ts                     # 🆕 Next.js middleware (защита роутов)
```

### 6.1 Переменные окружения (`.env.local`)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...         # Только сервер, для seed и админ-операций

# Database (прямое подключение — для Drizzle migrations)
DATABASE_URL=postgresql://postgres:...@db.xxxxx.supabase.co:5432/postgres

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000   # Для колбэков OAuth
```

---

## 7. Безопасность

### 7.1 Многоуровневая защита

```
Уровень 1: Middleware (проверка JWT)
  └── Проверка наличия сессии при доступе к защищённым роутам

Уровень 2: Server Actions / API Routes (авторизация)
  └── Проверка auth.getSession() + права роли

Уровень 3: RLS (Row Level Security в PostgreSQL)
  └── Политики на уровне строк БД — даже если код пропустит, БД не отдаст

Уровень 4: Валидация (Zod)
  └── Все входные данные валидируются на границе
```

### 7.2 Защита Server Actions

- Next.js автоматически защищает Server Actions от CSRF (проверка заголовков).
- Все Actions начинаются с `'use server'` — выполняются только на сервере.
- Валидация через Zod до любого обращения к БД.
- Проверка прав через `auth.getSession()` + `permissions.ts`.

### 7.3 RLS-политики (ключевые)

```sql
-- Пример: projects — владелец или owner/admin/manager для записи
CREATE POLICY "owner_or_can_write" ON public.projects
  FOR ALL USING (
    auth.uid() = owner_id
    OR public.can_write()
  );

CREATE POLICY "authenticated_can_read" ON public.projects
  FOR SELECT USING (
    auth.uid() = owner_id
    OR public.can_read()
  );

-- Пример: directory_materials — все могут читать, owner/admin/manager пишут
CREATE POLICY "authenticated_can_read" ON public.directory_materials
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "can_write_insert" ON public.directory_materials
  FOR INSERT WITH CHECK (public.can_write());

CREATE POLICY "can_write_update" ON public.directory_materials
  FOR UPDATE USING (public.can_write());

CREATE POLICY "can_write_delete" ON public.directory_materials
  FOR DELETE USING (public.can_write());
```

### 7.4 Supabase Storage RLS

```sql
-- Изображения материалов в бакете 'materials'
CREATE POLICY "public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'materials');

CREATE POLICY "admin_manager_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'materials' AND public.can_write()
  );
```

### 7.5 Переменные окружения

- `SUPABASE_SERVICE_ROLE_KEY` — **никогда** не передаётся на клиент. Используется только в:
  - `db/seed.ts` (заполнение начальных данных)
  - `lib/supabase/admin.ts` (административные операции)
  - Drizzle миграциях

---

## Приложение: Карта связей

### A. Сущность → Таблица

| TypeScript-тип (из `types/`) | Таблица PostgreSQL | Примечание |
|---|---|---|
| `ProjectRow` | `projects` | |
| `Work` | `estimate_works` | Внутри сметы |
| `Material` | `estimate_materials` | Внутри работы |
| `PurchaseRow` | `purchases` | Внутри сметы |
| `ExecutionRow` | `executions` | Внутри сметы |
| `GlobalPurchaseRow` | `global_purchases` | Автономная |
| `DirectoryMaterialRow` | `directory_materials` | Справочник |
| `DirectoryWorkRow` | `directory_works` | Справочник |
| `DirectorySupplierRow` | `directory_suppliers` | Справочник |
| `DirectoryCounterpartyRow` | `directory_counterparties` | Справочник |
| RBAC (роли) | `roles` + `permissions` + `role_permissions` + `user_roles` | |
| Workspace Members | `workspace_members` | Связь пользователь→workspace с ролью |
| Workspace Invitations | `workspace_invitations` | Ожидающие приглашения |
| Workspace Allowed Domains | `workspace_allowed_domains` | Белый список доменов |
| Account Settings | `user_settings` | 1:1 с profiles |

### B. Страница → Запрашиваемые данные

| Страница | Основной запрос | Связанные данные |
|---|---|---|
| `/dashboard` | Агрегации: количество проектов по статусам, бюджеты, прогресс | projects, estimates |
| `/projects` | `projects.findMany()` | profiles (владелец), counterparties (заказчик) |
| `/projects/[id]` | `projects.findOne({id})` + `estimates.findMany({projectId})` | profiles, counterparties |
| `/projects/[id]/estimates/[eid]` | `estimates.findOne({id})` + works + materials | directory_works, directory_materials |
| Вкладка Purchases | `purchases.findMany({estimateId})` | suppliers |
| Вкладка Executions | `executions.findMany({estimateId})` | — |
| `/directories/materials` | `directory_materials.findMany()` | profiles |
| `/directories/works` | `directory_works.findMany()` | profiles |
| `/directories/suppliers` | `directory_suppliers.findMany()` | profiles |
| `/directories/counterparties` | `directory_counterparties.findMany()` | profiles |
| `/procurements` | `global_purchases.findMany()` | suppliers, profiles |
| `/team` | `workspace_members.findMany({ownerId})` + `workspace_invitations.findMany({ownerId})` + `workspace_allowed_domains.findMany({ownerId})` | profiles |
| `/templates` | `templates.findMany()` | template_works, template_materials |
| `/settings/account` | `profiles.findOne({userId})` + `user_settings.findOne({userId})` | — |
| `/settings/access` | `roles.findMany()` + `permissions.findMany()` + `role_permissions.findMany()` | — |

### C. Связи Foreign Key (полный список)

```
profiles.id              ◀── projects.owner_id
profiles.id              ◀── estimates.created_by
profiles.id              ◀── templates.created_by
profiles.id              ◀── directory_materials.created_by
profiles.id              ◀── directory_works.created_by
profiles.id              ◀── directory_suppliers.created_by
profiles.id              ◀── directory_counterparties.created_by
profiles.id              ◀── global_purchases.created_by
profiles.id              ◀── user_roles.user_id
profiles.id              ◀── user_roles.assigned_by
profiles.id              ◀── user_settings.user_id
profiles.id              ◀── workspace_members.user_id
profiles.id              ◀── workspace_members.owner_id
profiles.id              ◀── workspace_invitations.invited_by
profiles.id              ◀── workspace_invitations.owner_id
profiles.id              ◀── workspace_allowed_domains.added_by
profiles.id              ◀── workspace_allowed_domains.owner_id

projects.id              ◀── estimates.project_id

estimates.id             ◀── estimate_works.estimate_id
estimates.id             ◀── purchases.estimate_id
estimates.id             ◀── executions.estimate_id

estimate_works.id        ◀── estimate_materials.estimate_work_id

templates.id             ◀── template_works.template_id
templates.id             ◀── estimates.template_id

template_works.id        ◀── template_materials.template_work_id

directory_works.id       ◀── estimate_works.directory_work_id
directory_works.id       ◀── template_works.directory_work_id

directory_materials.id   ◀── estimate_materials.directory_material_id
directory_materials.id   ◀── template_materials.directory_material_id

directory_suppliers.id   ◀── purchases.supplier_id
directory_suppliers.id   ◀── global_purchases.supplier_id

directory_counterparties.id ◀── projects.counterparty_id

roles.id                 ◀── role_permissions.role_id
roles.id                 ◀── user_roles.role_id

permissions.id           ◀── role_permissions.permission_id
```

---

## 9. Чек-лист реализации

- [ ] Supabase проект создан, переменные окружения добавлены
- [ ] Drizzle конфигурация (`drizzle.config.ts`) настроена
- [ ] Схемы БД написаны (`db/schema/*.ts`)
- [ ] Миграции сгенерированы и применены (`drizzle-kit generate` + `drizzle-kit migrate`)
- [ ] Seed-данные: роли, разрешения, связи role_permissions
- [ ] Supabase-клиенты (browser, server, middleware, admin) созданы
- [ ] Next.js middleware настроен (защита роутов)
- [ ] RLS-политики применены ко всем таблицам
- [ ] Auth страницы подключены к Supabase Auth
- [ ] Profiles таблица создана + триггер на auth.users
- [ ] Справочники: API Routes + Server Actions
- [ ] Projects: API Routes + Server Actions
- [ ] Estimates + Works + Materials: API Routes + Server Actions
- [ ] Purchases + Executions: API Routes + Server Actions
- [ ] Global Purchases: API Routes + Server Actions
- [ ] Templates: API Routes + Server Actions (включая applyTemplate)
- [ ] Access Control: API Route + Server Actions (assignRole, removeRole)
- [ ] Workspace Settings: API Routes + Server Actions (invite/remove/changeRole/suspend/revoke/domains/transfer/leave)
- [ ] Settings: API Route + Server Actions
- [ ] Dashboard: API Routes (агрегации)
- [ ] Удалены все `__mocks__/` (projects, estimates, purchases, execution, directories/*, access-control, account-settings, workspace-settings, global-purchases)
- [ ] Хуки переписаны на реальные данные
- [ ] Файловое хранилище Supabase Storage настроено (бакет 'materials')
- [ ] Загрузка изображений материалов работает
