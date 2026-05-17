# /directories/counterparties — справочник контрагентов

> Last updated: 2026-05-17
>
> Status: first production slice for `/directories/counterparties`.
>
> Related issue: #127.

## Назначение

Справочник контрагентов хранит заказчиков и подрядчиков текущей рабочей области. Раздел должен быть простым рабочим справочником: список, добавление, редактирование, архивирование, обычный поиск и базовые состояния экрана.

Справочник работ используется только как общий образец поведения справочника: внешний вид, состояния экрана, порядок действий, проверка доступа и границы рабочей области.

## Поля контрагента

Общие поля первой версии:

```txt
name                название или ФИО, обязательно
type                customer / contractor
legalStatus         juridical / individual
inn                 ИНН
phone               телефон
```

Поля юр. лица:

```txt
legalAddress        юридический адрес
bankName            наименование банка
bik                 БИК
corrAccount         корреспондентский счёт
accountNumber       расчётный счёт
```

Поля физ. лица:

```txt
passportSeries          серия паспорта
passportNumber          номер паспорта
passportIssuedBy        кем выдан
passportIssueDate       дата выдачи
passportDepartmentCode  код подразделения
registrationAddress     адрес регистрации
```

Служебные поля:

```txt
status              active / archived
version
createdBy
updatedBy
createdAt
updatedAt
archivedAt
deletedAt
workspaceOwnerId
```

Название или ФИО обязательно. Тип контрагента и статус лица выбираются из списка. Остальные поля необязательные, чтобы пользователь мог быстро добавить запись.

## Действия первой версии

Поддерживаются:

```txt
получить список
получить одну запись
добавить контрагента
изменить контрагента
архивировать контрагента
обычный поиск
обновить список после изменения
```

Форма используется и для добавления, и для редактирования. При архивировании запись не удаляется физически, а получает архивный статус.

## Поиск

В первой версии нужен только обычный поиск. Умный поиск, похожие совпадения и AI-поиск не входят в этот этап.

Поиск работает по:

```txt
названию / ФИО
ИНН
телефону
БИК
расчётному счёту
серии паспорта
номеру паспорта
общему тексту реквизитов
```

Обычный список показывает только активные записи.

## Что не входит в первую версию

Не реализуется в рамках первого этапа:

```txt
импорт
экспорт
умный поиск
сложные фильтры
массовые действия
связь с проектами
связь со сметами
связь с закупками
автоматическое заполнение по ИНН
проверка паспортных данных через внешние сервисы
проверка банковских реквизитов через внешние сервисы
```

## Хранение данных

Данные хранятся отдельно от поставщиков, работ и материалов:

```txt
public.directory_counterparties
```

Таблица привязана к текущей рабочей области через `workspace_owner_id`. Клиент не передаёт рабочую область как источник истины. Сервер определяет текущую рабочую область по пользователю и проверяет доступ перед чтением или изменением.

## Доступ

Чтение доступно пользователю с доступом к текущей рабочей области.

Изменение доступно ролям:

```txt
owner
admin
manager
```

Обычный список исключает архивные и удалённые записи.

## Карта файлов

```txt
app/(main)/directories/counterparties/page.tsx
features/directories/components/counterparties-toolbar.tsx
features/directory-counterparties/components/directory-counterparties-view.tsx
features/directory-counterparties/directory-counterparties-details/components/directory-counterparties-section.tsx
features/directory-counterparties/directory-counterparties-details/components/directory-counterparties-row.tsx
features/directory-counterparties/directory-counterparties-details/components/directory-counterparties-create-dialog.tsx
features/directory-counterparties/hooks/use-directory-counterparties.ts
features/directory-counterparties/api/directory-counterparties-client.ts
features/directory-counterparties/api/directory-counterparties-query-keys.ts
features/directory-counterparties/server/directory-counterparties.route-handlers.ts
features/directory-counterparties/server/directory-counterparties.service.ts
features/directory-counterparties/server/directory-counterparties.repository.ts
features/directory-counterparties/server/directory-counterparties.schemas.ts
features/directory-counterparties/types.ts
app/api/directory-counterparties/route.ts
app/api/directory-counterparties/[id]/route.ts
db/schema/directory-counterparties.ts
db/migrations/024_directory_counterparties_foundation.sql
```
