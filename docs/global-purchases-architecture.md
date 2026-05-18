# /procurements — первый рабочий слой глобальных закупок

> Last updated: 2026-05-18
>
> Status: first production slice for `/procurements`.
>
> Related issue: #132.

## Назначение

Раздел глобальных закупок показывает закупки текущей рабочей области. Первый рабочий слой заменяет временные данные на реальные записи и даёт пользователю базовый набор действий: открыть список, найти закупку, отфильтровать по статусу или объекту, добавить закупку, изменить закупку и убрать её из обычного списка через архив.

Раздел не является справочником, но использует тот же безопасный подход к данным, что и справочники: текущая рабочая область определяется на сервере, чтение доступно только участникам рабочей области, изменение доступно только разрешённым ролям, а обычный список не показывает архивные и удалённые записи.

## Поля первого этапа

Поля, которые пользователь заполняет вручную:

```txt
title           название закупки, обязательно
unit            единица измерения, обязательно
planQuantity    плановое количество, обязательно
planPrice       плановая цена, обязательно
factQuantity    фактическое количество, необязательно
factPrice       фактическая цена, необязательно
projectId       объект из раздела проектов, необязательно
purchaseDate    дата закупки, необязательно
status          planned / ordered / partially_received / received / cancelled
notes           примечание, необязательно
```

Поля, которые заполняются или рассчитываются системой:

```txt
projectTitle     отображаемая копия названия объекта
supplierId       пока не используется
supplierName     пока не используется
planTotal        плановая сумма
factTotal        фактическая сумма, если заполнены факт-количество и факт-цена
deviationTotal   разница между планом и фактом
```

Служебные поля:

```txt
workspaceOwnerId
createdBy
updatedBy
createdAt
updatedAt
archivedAt
deletedAt
```

Поставщик пока не выбирается в форме закупки, потому что рабочий справочник поставщиков ещё не подключён. Поля поставщика оставлены в хранении для будущего связывания, но первый экран отправляет их пустыми.

## Действия первого этапа

Поддерживаются:

```txt
получить список закупок
получить одну закупку
создать закупку
изменить закупку
архивировать закупку
поиск по названию, единице, объекту, поставщику и примечанию
фильтр по статусу
фильтр по объекту
обновление списка после изменения
постраничный вывод
```

Архивирование мягкое: закупка не удаляется физически, а получает `archivedAt`. Обычный список такие закупки не показывает.

## Что не входит в первый этап

Не реализуется в рамках первого этапа:

```txt
импорт
экспорт
AI-поиск
складской учёт
платежи
автоматическое создание закупок из смет
массовые действия
выбор поставщика из отдельного справочника
сравнение коммерческих предложений
доставка и статусы логистики
```

Кнопки импорта и экспорта скрыты, чтобы не запускать чужую или неготовую логику.

## Хранение данных

Данные закупок хранятся отдельно:

```txt
public.global_purchases
```

Таблица привязана к текущей рабочей области через `workspace_owner_id`. Клиент не передаёт рабочую область как источник истины. Сервер определяет текущую рабочую область по текущему пользователю и проверяет доступ перед чтением или изменением.

Закупка может ссылаться на объект из `public.projects` через `project_id`. При удалении объекта ссылка очищается, а `project_title` остаётся отображаемой копией названия.

Для обычного поиска таблица хранит подготовленные поля `normalized_title` и `search_text`. Они заполняются автоматически при добавлении и изменении закупки.

## Доступ

Чтение доступно пользователю с доступом к текущей рабочей области.

Изменение доступно ролям:

```txt
owner
admin
manager
```

Обычный список исключает архивные и удалённые закупки.

## Карта файлов

```txt
app/(main)/procurements/page.tsx
app/api/global-purchases/route.ts
app/api/global-purchases/[id]/route.ts
features/global-purchases/api/global-purchases-client.ts
features/global-purchases/api/global-purchases-errors.ts
features/global-purchases/api/global-purchases-query-keys.ts
features/global-purchases/hooks/use-global-purchases.ts
features/global-purchases/lib/global-purchases-events.ts
features/global-purchases/server/global-purchases.route-handlers.ts
features/global-purchases/server/global-purchases.service.ts
features/global-purchases/server/global-purchases.repository.ts
features/global-purchases/server/global-purchases.schemas.ts
features/global-purchases/global-purchases-details/components/global-purchase-form-dialog.tsx
features/global-purchases/global-purchases-details/components/global-purchases-toolbar.tsx
features/global-purchases/global-purchases-details/components/global-purchases-view.tsx
features/global-purchases/global-purchases-details/components/global-purchases-section.tsx
features/global-purchases/global-purchases-details/components/global-purchases-row.tsx
types/global-purchases.ts
db/schema/global-purchases.ts
db/migrations/029_global_purchases_foundation.sql
```

## Проверка готовности

Перед сдачей нужно проверить:

```txt
/procurements открывается без временных данных
список берётся из базы
поиск работает
фильтр по статусу работает
фильтр по объекту работает
можно создать закупку
можно изменить закупку
можно архивировать закупку
после действий список обновляется
архивная закупка исчезает из обычного списка
есть загрузка, пустое состояние и понятная ошибка
отладочные рамки удалены
импорт и экспорт скрыты
временный список не используется в рабочем потоке
```
