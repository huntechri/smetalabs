# Дашборд (dashboard)

> Статус: production (интеграция с API, хуки, RSC) | 2026-05-27

## Назначение

Главная страница приложения после входа. Отображает агрегированные показатели воркспейса (KPI-карточки), интерактивный график денежного потока и таблицу со списком проектов в работе. Модуль полностью интегрирован с серверным API и базой данных через React Query.

## Структура модуля

```
features/dashboard/
  hooks/
    use-workspace-dashboard-stats.ts     — хук для получения KPI воркспейса и подготовки данных графика
    use-workspace-dashboard-projects.ts  — хук для получения списка активных проектов в работе
  chart-area-client.tsx         — ленивая загрузка графика (dynamic import + Skeleton)
  chart-area-interactive.tsx    — интерактивный area chart (Recharts) с фильтром по датам
  data-table.tsx                — таблица проектов в работе с сортировкой и пагинацией
  section-cards-dashboard.tsx   — 4 KPI-карточки воркспейса (договор, оплачено, баланс, отклонение)

app/(main)/dashboard/
  page.tsx                      — страница дашборда (Server Component)
  data.json                     — мок-данные (сохранены как архив/резервная копия)
  page.tsx.recharts             — резервная копия клиентской версии страницы
```

## Данные

Данные дашборда запрашиваются динамически с бэкенда:

- **Финансовые показатели и транзакции** — запрашиваются через хук [use-workspace-dashboard-stats.ts](file:///c:/Users/Admin/smetalabs/features/dashboard/hooks/use-workspace-dashboard-stats.ts) из эндпоинта `/api/dashboard/stats`.
- **Проекты в работе** — запрашиваются через хук [use-workspace-dashboard-projects.ts](file:///c:/Users/Admin/smetalabs/features/dashboard/hooks/use-workspace-dashboard-projects.ts) из эндпоинта `/api/projects` с фильтрацией `status: "in_progress"`.

## API

- `GET /api/dashboard/stats` — возвращает общие финансовые агрегаты воркспейса и историю транзакций для построения графика.
- `GET /api/projects` — список проектов (используется фильтр `{ status: "in_progress", limit: 100 }`).

## Компоненты

### `SectionCards` (`section-cards-dashboard.tsx`)

Отображает четыре ключевые карточки с финансовым состоянием воркспейса:
1. **Договор** — плановые показатели по всем сметам.
2. **Оплачено** — сумма фактически поступивших платежей.
3. **Баланс** — разница между приходами и расходами.
4. **Отклонение** — процентное отклонение фактических трат от сметы.

Использует хук `useWorkspaceDashboardStats()`.

### `ChartAreaInteractive` (`chart-area-interactive.tsx`)

Визуализирует денежный поток воркспейса:
- Включает бары приходов (`inflow`), расходов (`outflow`, преобразуется в отрицательные значения) и линию кумулятивного баланса (`balance`).
- Фильтрация периода: 90 дней, 30 дней, 7 дней.
- Компонент является чисто презентационным. Вся математика расчета шкал Y (`minVal`, `maxVal`), смещения градиента (`off`) и трансформация массивов делегированы в хук `useWorkspaceDashboardStats`.
- Обернут в [chart-area-client.tsx](file:///c:/Users/Admin/smetalabs/features/dashboard/chart-area-client.tsx) через `next/dynamic` для ленивой загрузки на клиенте с fallback-заглушкой `Skeleton`.

### `DataTable` (`data-table.tsx`)

Таблица, выводящая список активных проектов:
- Поддерживает сортировку колонок, пагинацию, переходы на детальные карточки проектов.
- Загрузка данных полностью вынесена в хук `useWorkspaceDashboardProjects`.
- Форматирование дат осуществляется централизованно функцией `formatDateRange` из `@/lib/formatters`.

## Хуки

- `useWorkspaceDashboardStats(timeRange)` — запрашивает общие агрегаты, преобразует транзакции в точки для графика, считает границы осей и градиенты.
- `useWorkspaceDashboardProjects()` — запрашивает проекты в работе с установленным временем кэширования (`staleTime: 30_000`).

## Зависимости

- `@tanstack/react-query` — менеджмент серверного состояния и кэширование
- `@tanstack/react-table` — табличная логика
- `recharts` — построение графиков
- `@phosphor-icons/react` — иконки

## Архитектурные особенности

1. **Server Component на уровне роута**:
   Файл `app/(main)/dashboard/page.tsx` является серверным компонентом Next.js (без `"use client"`). Он отвечает за рендеринг структуры разметки страницы, а интерактивные компоненты подключаются как клиентские.
2. **Разделение логики запросов и UI**:
   Ни один компонент дашборда не обращается к `useQuery` или API-клиентам напрямую. Вся логика работы с сетью и подготовки данных инкапсулирована в папке `hooks/`.
