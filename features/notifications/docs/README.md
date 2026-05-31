# Уведомления (notifications)

> Статус: ✅ production | 2026-05-22

## Назначение

Модуль уведомлений обеспечивает систему in-app-оповещений пользователей SmetaLab с поддержкой real-time доставки через Supabase Realtime и email-дублирования для критических событий.

## Структура модуля

```
features/notifications/
  api/
    notifications-client.ts          — клиентские API-функции (fetch, markRead, archive)
    notifications-query-keys.ts      — ключи для React Query кэша
  application/
    use-notifications.ts             — хуки React Query + Realtime-подписка (загрузка и realtime orchestration)
  model/
    notifications-model.ts           — бизнес-логика форматирования дат и маппинга визуального оформления
    notifications-model.test.ts      — юнит-тесты для модели
  ui/
    notification-bell.tsx            — кнопка-колокольчик с индикатором непрочитанных
    notification-item.tsx            — карточка одного уведомления (иконка, текст, действия)
    notification-list.tsx            — попап-список с табами «Непрочитанные»/«Все»
  server/
    notifications.repository.ts      — доступ к БД (CRUD)
    notifications.service.ts         — бизнес-логика отправки (проверка настроек, email)

app/api/notifications/
  route.ts                           — GET /api/notifications (список + unreadCount)
  read/route.ts                      — POST /api/notifications/read (отметить прочитанными)
  archive/route.ts                   — POST /api/notifications/archive (мягкое удаление)

db/
  schema/notifications.ts            — Drizzle-схема таблицы notifications
  migrations/042_notifications_foundation.sql  — SQL-миграция (таблица, RLS, Realtime)
```

## Данные

### Таблица `notifications`

| Поле | Тип | Назначение |
|------|-----|-----------|
| `id` | `uuid PK` | Автоматически генерируемый ID |
| `recipient_id` | `uuid FK → profiles.id` | Получатель уведомления |
| `workspace_owner_id` | `uuid FK → profiles.id` | Владелец воркспейса (изоляция данных) |
| `actor_id` | `uuid FK → profiles.id` (nullable) | Инициатор события |
| `type` | `text` | Тип события: `project_created`, `estimate_approved`, `team_invitation_created` и др. |
| `title` | `text` | Заголовок уведомления |
| `body` | `text` | Тело уведомления |
| `link` | `text` (nullable) | URL для перехода по клику |
| `metadata` | `jsonb` | Дополнительные динамические данные |
| `read_at` | `timestamptz` (nullable) | Время прочтения |
| `archived_at` | `timestamptz` (nullable) | Время архивации (мягкое удаление) |
| `created_at` | `timestamptz` | Время создания |
| `updated_at` | `timestamptz` | Время обновления |

### Индексы

- `idx_notifications_recipient_read` — по `(recipient_id, read_at)` с фильтром `archived_at IS NULL` (для выборки непрочитанных)
- `idx_notifications_recipient_created` — по `(recipient_id, created_at DESC)` (для списков)
- `idx_notifications_workspace` — по `workspace_owner_id` (для tenant-изоляции)

### RLS-политики

| Политика | Операция | Правило |
|----------|----------|---------|
| `notifications_select` | SELECT | `recipient_id = auth.uid()` |
| `notifications_update` | UPDATE | `recipient_id = auth.uid()` |

Пользователь видит и редактирует только свои уведомления. Запись в таблицу происходит через серверные API-роуты (service_role).

### Realtime

Таблица добавлена в публикацию `supabase_realtime`. Клиент подписывается на события `INSERT` с фильтром по `recipient_id`, что позволяет мгновенно показывать toast-уведомления при появлении новых событий.

## API

### `GET /api/notifications`

**Параметры запроса:**

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|-------------|----------|
| `unreadOnly` | `boolean` | `false` | Только непрочитанные |
| `limit` | `number` | `20` (max 100) | Количество на странице |
| `offset` | `number` | `0` | Смещение |

**Ответ:** `{ data: { notifications: Notification[], unreadCount: number, hasMore: boolean } }`

**Аутентификация:** обязательна (401 при отсутствии сессии)

### `POST /api/notifications/read`

**Тело запроса:** `{ ids?: string[], all?: boolean }`

Отмечает указанные (или все) уведомления как прочитанные (`read_at = now()`). Применяется только к непрочитанным и неархивированным.

**Ответ:** `{ data: { success: true } }`

### `POST /api/notifications/archive`

**Тело запроса:** `{ ids?: string[], all?: boolean }`

Переносит указанные (или все) уведомления в архив (`archived_at = now()`). Мягкое удаление — данные остаются в БД.

**Ответ:** `{ data: { success: true } }`

## Слои фичи (Client-side)

### 1. UI Layer (`features/notifications/ui/`)

Компоненты отвечают исключительно за отображение и вёрстку (layout/rendering). Они импортируют хуки из прикладного слоя и чистые хелперы из модели.

*   `NotificationBell` — кнопка-колокольчик в хедере приложения. Инициализирует Supabase Realtime прослушивание при монтировании и отображает красный бейдж с количеством непрочитанных уведомлений.
*   `NotificationList` — выпадающий список уведомлений внутри поповера. Содержит табы «Непрочитанные» / «Все», анимированные скелетоны при загрузке, пустое состояние и кнопку «Прочитать все».
*   `NotificationItem` — карточка одного уведомления. Отображает иконку, тип, тело, относительное время, точку непрочитанного и кнопку архивации в архив (при наведении).

### 2. Application Layer (`features/notifications/application/`)

Содержит прикладную логику загрузки данных, Supabase Realtime подписок и инвалидации кэша React Query:

*   `useNotifications(filters)` — React Query хук для получения списка уведомлений с фильтрацией (unreadOnly, limit).
*   `useNotificationsCount()` — React Query хук для получения количества непрочитанных уведомлений (для бейджа).
*   `useMarkNotificationsRead()` — мутация для отметки уведомлений как прочитанных.
*   `useArchiveNotifications()` — мутация для архивации уведомлений.
*   `useNotificationsRealtime()` — подписывается на Supabase Realtime канал (`INSERT` в таблицу `notifications` с фильтром по `recipient_id`). При поступлении нового уведомления показывает всплывающий тост с возможностью быстрого перехода по ссылке и инвалидирует кэш React Query.

### 3. Model Layer (`features/notifications/model/`)

Содержит чистые функции бизнес-логики, свободные от зависимостей React и HTML-рендеринга. Полностью покрыт тестами.

*   `formatRelativeTime(dateString)` — чистая функция форматирования относительного времени на русском языке («Только что», «5 мин. назад», «2 ч. назад», дата).
*   `getNotificationVisualType(type)` — маппер типа события (`project_*`, `estimate_*`, `procurement_*`, `team_*`, `billing_*`) в визуальный тип иконки (`briefcase`, `calculator`, etc.) и соответствующий CSS-класс для Tailwind (цвета фона и текста).
*   `NotificationIconType` — перечисление поддерживаемых типов иконок.

## Серверный слой

### `notifications.repository.ts`

Низкоуровневые операции с БД через `supabase` из `@/db`:

| Функция | Назначение |
|---------|-----------|
| `getUserNotifications(userId, filters)` | Список активных уведомлений (archived_at IS NULL) |
| `getUnreadCount(userId)` | Подсчёт непрочитанных (count query) |
| `markAsRead(userId, ids?, markAll?)` | Отметка прочитанными |
| `archiveNotifications(userId, ids?, archiveAll?)` | Мягкое удаление |
| `insertNotification(params)` | Создание записи в БД |

### `notifications.service.ts`

Бизнес-логика отправки уведомлений. Класс `NotificationsService`:

1. **Проверка настроек** — через `checkUserPreference()` читает `user_settings.notifications` и решает, нужно ли отправлять уведомление данного типа. Карта соответствия типов событий и ключей настроек:

| Тип события | Ключ настройки |
|------------|---------------|
| `project_*` | `projectUpdates` |
| `estimate_*` | `estimateUpdates` |
| `procurement_*` | `procurementUpdates` |
| `team_*` | `teamInvitations` |
| `billing_*` | `billingNotifications` |

2. **In-app запись** — сохраняет уведомление в БД через `insertNotification()`
3. **Email-дублирование** — для критических событий (`team_invitation_created`, `billing_limit_reached`, `estimate_approved`) отправляет email через `EmailTransporter`

**Email-транспортёр** — по умолчанию `consoleEmailTransporter` (логирует в консоль). В продакшене заменяется на Resend/SendGrid через интерфейс `EmailTransporter`.

Дефолтный инстанс: `notificationsService` (экспортируется как singleton).

## Типы событий (event types)

В коде зарегистрированы следующие типы:

- `project_created`, `project_updated`, `project_deleted`
- `estimate_created`, `estimate_updated`, `estimate_approved`, `estimate_rejected`, `estimate_deleted`
- `procurement_created`, `procurement_updated`, `procurement_approved`, `procurement_cancelled`
- `team_invitation_created`, `team_invitation_accepted`
- `billing_invoice_created`, `billing_limit_reached`

## Tenant boundary

- **Изоляция:** каждое уведомление привязано к `workspace_owner_id` и индексируется по нему
- **RLS:** пользователь видит только свои уведомления (`recipient_id = auth.uid()`)
- **API:** `workspace_owner_id` проставляется серверно при создании уведомления
- **Realtime:** подписка фильтруется по `recipient_id`, исключая утечку между пользователями

## Текущие ограничения

1. **Email-транспортёр** по умолчанию — консольный логгер. Требуется интеграция с реальным почтовым сервисом для продакшена.
2. **Нет пагинации с курсором** — только offset-based пагинация.
3. **Push-уведомления** (web push, мобильные) не реализованы.
4. **Нет массового создания уведомлений** (один ко многим) — например, уведомить всю команду о новом проекте.
5. **Нет scheduled/отложенных уведомлений** — например, weekly summary.
