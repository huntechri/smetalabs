# Directory works reference for future directories

> Last updated: 2026-05-17
>
> Purpose: краткая выжимка того, что нужно брать из `/directories/works` как образец для новых справочников.

## Что брать как стандарт

`/directories/works` должен рассматриваться как полный образец, а не только как UI.

Он задаёт пример для:

```txt
экран
верхняя панель
список
строка
поиск
фильтр
добавление
редактирование
архивирование
импорт
экспорт
проверка доступа
обработка ошибок
состояние загрузки
пустое состояние
обновление данных после изменений
```

## Эталон верхней панели

Верхняя панель нового справочника должна повторять поведение works:

```txt
поиск
фильтр, если фильтры есть
добавить
импорт, если поддерживается
экспорт, если поддерживается
```

Поиск должен писать значение в URL и сбрасывать страницу списка.

При изменении любого фильтра нужно сбрасывать `cursor`, чтобы пользователь не оставался на старой странице уже другого набора данных.

Если фильтры зависимые, следующий фильтр должен сужаться по предыдущему уровню. Например, если выбран раздел или подраздел, список поставщиков должен показывать только поставщиков внутри выбранного уровня, а не всех поставщиков справочника.

## Эталон строки списка

Строка works является визуальным эталоном для строк других справочников.

Внешний блок строки:

```txt
mx-3 my-1.5 grid gap-3 rounded-md border border-border p-3 transition-colors hover:bg-muted/50
```

Строку не нужно заворачивать в дополнительную generic-карточку, если это ломает визуальное совпадение с works.

Структура строки:

```txt
левая секция  → идентификация записи
правая секция → метрики, классификация, действия
```

Левая секция должна иметь отдельную рамку:

```txt
grid min-w-0 gap-3 rounded-md border border-border p-2
```

Внутри левой секции каждый важный идентификатор должен иметь свой `div` с рамкой:

```txt
min-w-0 rounded-md border border-border p-2
```

Для works это:

```txt
КОД
НАЗВАНИЕ
```

Для materials это:

```txt
КОД
НАЗВАНИЕ
```

Правая секция должна иметь отдельную рамку:

```txt
grid min-w-0 gap-1.5 rounded-md border border-border p-1.5
```

Внутри правой секции каждая группа метрик должна иметь свой `div` с рамкой:

```txt
flex min-w-0 flex-col gap-1.5 rounded-md border border-border p-1.5
```

Для works группы:

```txt
ЕД. ИЗМ / РАСЦЕНКА
КАТЕГОРИЯ
```

Для materials допустимая проекция по этому же паттерну:

```txt
ЕД. ИЗМ / ЦЕНА
КАТЕГОРИЯ / ПОСТАВЩИК
```

## Эталон шрифтов в строке

Заголовки секций должны выглядеть как в works:

```txt
text-xs text-muted-foreground uppercase
```

Видимый текст заголовков должен быть капсом:

```txt
КОД
НАЗВАНИЕ
ЕД. ИЗМ / РАСЦЕНКА
КАТЕГОРИЯ
```

Если другой справочник использует свои поля, они тоже должны быть капсом:

```txt
ЕД. ИЗМ / ЦЕНА
КАТЕГОРИЯ / ПОСТАВЩИК
```

Значение кода:

```txt
font-mono text-xs font-medium leading-snug
```

Значение названия:

```txt
text-sm font-medium leading-snug
```

Значения метрик должны использовать общие UI-примитивы, если они есть в `components/ui`. Для текущего паттерна это обычно:

```txt
Badge
Button
DropdownMenu
```

## Эталон действий строки

Стандартное меню строки:

```txt
Добавить ниже
Редактировать
Архивировать
```

Кнопка действий должна быть общей кнопкой из `components/ui/button`, меню — из `components/ui/dropdown-menu`.

Во время сохранения или обновления списка действия должны быть отключены.

## Эталон состояний списка

Список должен иметь состояния:

```txt
loading
empty
error
list
pagination
```

Скелетон загрузки должен повторять структуру готовой строки. Если готовая строка имеет отдельные рамки для идентификации и метрик, скелетон должен иметь такие же секции, чтобы интерфейс не прыгал после загрузки.

## Что нельзя копировать без замены

После копирования нельзя оставлять:

```txt
works
Works
directory-works
directory_works
work_id
работ
Работы
```

Исключение — если текст прямо ссылается на `/directories/works` как на эталон.

## Что должно быть отдельным у каждого справочника

```txt
названия файлов
названия компонентов
тексты интерфейса
поля формы
строка списка
адреса API
серверная логика
таблицы
миграции
импортные колонки
экспортные колонки
ошибки
тесты
```

## Минимальный набор для нового production-справочника

```txt
app/(main)/directories/<name>/page.tsx
features/directories/components/<name>-toolbar.tsx
features/directory-<name>/components/directory-<name>-view.tsx
features/directory-<name>/directory-<name>-details/components/directory-<name>-section.tsx
features/directory-<name>/directory-<name>-details/components/directory-<name>-row.tsx
features/directory-<name>/hooks/use-directory-<name>.ts
features/directory-<name>/api/directory-<name>-client.ts
features/directory-<name>/api/directory-<name>-query-keys.ts
features/directory-<name>/server/directory-<name>.service.ts
features/directory-<name>/server/directory-<name>.repository.ts
app/api/directory-<name>/route.ts
app/api/directory-<name>/[id]/route.ts
db/schema/directory-<name>.ts
db/migrations/<number>_directory_<name>_foundation.sql
```

## Первый кандидат

Следующий раздел для приведения к стандарту:

```txt
/directories/materials
```

Причина: страница уже похожа по верхнему уровню, но поток данных и UI должны быть доведены до эталона works без случайных works-зависимостей.
