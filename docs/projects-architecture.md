# /projects — рабочий слой проектов

> Last updated: 2026-05-19
>
> Status: production slice for `/projects` and project estimate records.
>
> Related issues: #129.

## Назначение

Раздел проектов хранит базовый список объектов текущей рабочей области. Первый рабочий слой нужен для того, чтобы пользователь мог открыть `/projects`, увидеть реальные проекты, найти нужный проект, добавить новый, изменить существующий и убрать проект из обычного списка через архив.

Этот раздел не является справочником, но использует тот же общий подход к безопасной работе с данными: текущая рабочая область определяется на сервере, чтение доступно только участникам рабочей области, изменение доступно только разрешённым ролям, а обычный список не показывает архивные и удалённые записи.

Страница конкретного проекта `/projects/[projectId]` содержит первый рабочий слой реестра смет проекта. Этот слой хранит только строки списка смет проекта и не является содержимым сметы.

## Поля проекта

Поля, которые пользователь заполняет вручную:

```txt
title                   название проекта, обязательно
customerCounterpartyId   выбранный контрагент-заказчик, необязательно
address                 адрес объекта, необязательно
startDate               дата начала, необязательно
endDate                 дата окончания, необязательно
status                  new / in_progress / completed
```

Поля, которые не заполняются вручную:

```txt
customerName             отображаемое имя выбранного заказчика, заполняется сервером
budgetAmount            бюджет, будет считаться автоматически позже
progress                прогресс, будет считаться автоматически позже
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

`title` обязателен. `status` выбирается из фиксированного списка. Бюджет и прогресс не принимаются из формы проекта. До появления автоматической логики бюджет хранится как `null`, а прогресс как `0`.

Заказчик выбирается из активных контрагентов типа `customer` текущей рабочей области. Клиент передаёт только идентификатор выбранного контрагента. Сервер сам проверяет, что контрагент существует, относится к текущей рабочей области, активен и имеет тип заказчика. `customerName` хранится как отображаемая копия имени выбранного контрагента.

## Действия проекта

Поддерживаются:

```txt
получить список проектов
получить один проект
создать проект
изменить проект
архивировать проект
поиск по названию, заказчику и адресу
фильтр по статусу
обновить список после изменения
```

Архивирование мягкое: проект не удаляется физически, а получает `archivedAt`. Обычный список такие проекты не показывает.

## Реестр смет проекта

Реестр смет проекта живёт внутри страницы конкретного проекта:

```txt
/projects/[projectId]
```

Этот слой хранит только строки списка смет. Он не хранит состав сметы, работы, материалы, расчёты, документы, закупки или выполнение.

Поля строки реестра:

```txt
name        название сметы, обязательно
type        тип сметы, сейчас системное значение по умолчанию
status      new / in_progress / completed
amount      сумма, сейчас системное значение
createdAt   дата создания
```

Служебные поля:

```txt
workspaceOwnerId
projectId
createdBy
updatedBy
updatedAt
archivedAt
deletedAt
```

Поддерживаются действия:

```txt
получить список смет проекта
создать смету по названию
переименовать смету
удалить смету из списка
```

Удаление мягкое: строка получает `deletedAt` и исчезает из обычного списка.

## Что не входит в текущий слой реестра смет

Не реализуется:

```txt
состав сметы
разделы сметы
работы внутри сметы
материалы внутри сметы
расчёты
документы
закупки
выполнение
импорт
экспорт
AI-функции
```

## Хранение данных

Данные проектов хранятся отдельно:

```txt
public.projects
```

Строки реестра смет проекта хранятся отдельно:

```txt
public.project_estimate_records
```

Обе таблицы привязаны к текущей рабочей области через `workspace_owner_id`. Клиент не передаёт рабочую область как источник истины. Сервер определяет текущую рабочую область по текущему пользователю и проверяет доступ перед чтением или изменением.

`project_estimate_records` дополнительно привязана к проекту через `project_id` и не может ссылаться на проект из другой рабочей области.

Проект может ссылаться на заказчика из справочника контрагентов через `customer_counterparty_id`. При удалении контрагента ссылка очищается, а `customer_name` остаётся отображаемой копией.

Для обычного поиска проектов таблица хранит подготовленные поля `normalized_title` и `search_text`. Они заполняются автоматически при добавлении и изменении проекта.

Для реестра смет хранится `normalized_name`, чтобы проверять совпадение названий внутри одного проекта.

## Доступ

Чтение доступно пользователю с доступом к текущей рабочей области.

Изменение доступно ролям:

```txt
owner
admin
manager
```

Обычные списки исключают архивные и удалённые записи.

## Карта файлов

```txt
app/(main)/projects/page.tsx
app/(main)/projects/[projectId]/page.tsx
features/projects/components/projects-view.tsx
features/projects/components/projects-toolbar.tsx
features/projects/components/project-card.tsx
features/projects/components/create-project-dialog.tsx
features/projects/project-overview/components/section-cards.tsx
features/projects/project-overview/components/chart-area-interactive.tsx
features/projects/project-overview/components/estimates-table.tsx
features/projects/project-overview/components/estimate-name-dialog.tsx
features/projects/project-overview/components/estimate-delete-dialog.tsx
features/projects/project-overview/lib/estimate-table-data.ts
features/projects/project-overview/types.ts
features/projects/hooks/use-projects.ts
features/projects/hooks/use-project-estimate-records.ts
features/projects/api/projects-client.ts
features/projects/api/project-estimate-records-client.ts
features/projects/api/projects-errors.ts
features/projects/api/projects-query-keys.ts
features/projects/server/projects.route-handlers.ts
features/projects/server/projects.service.ts
features/projects/server/projects.repository.ts
features/projects/server/projects.schemas.ts
features/projects/server/project-estimate-records.route-handlers.ts
features/projects/server/project-estimate-records.service.ts
features/projects/server/project-estimate-records.repository.ts
features/projects/server/project-estimate-records.schemas.ts
types/project.ts
types/project-estimate-record.ts
app/api/projects/route.ts
app/api/projects/[id]/route.ts
app/api/projects/[id]/estimate-records/route.ts
app/api/projects/[id]/estimate-records/[recordId]/route.ts
db/schema/projects.ts
db/schema/project-estimate-records.ts
db/migrations/026_projects_foundation.sql
db/migrations/027_projects_function_grants.sql
db/migrations/028_projects_customer_counterparty.sql
db/migrations/033_project_estimate_records_foundation.sql
```

## Проверка готовности

Перед сдачей нужно проверить:

```txt
/projects открывается без временных данных
список проектов берётся из базы
поиск работает по названию, заказчику и адресу
фильтр по статусу работает
можно создать проект
можно выбрать заказчика из контрагентов
в форме нет ручного ввода бюджета и прогресса
можно изменить проект
можно архивировать проект
после действий список обновляется
архивный проект исчезает из обычного списка
/projects/[projectId] открывается
таблица смет проекта берётся из базы
можно создать смету по названию
можно переименовать смету
можно удалить смету из списка
после действий список смет обновляется
удалённая смета исчезает из обычного списка
есть загрузка, пустое состояние и понятная ошибка
отладочные рамки удалены
временный список не используется в рабочем потоке
```
