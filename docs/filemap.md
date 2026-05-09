# SmetaLabs — Карта проекта (Filemap)

> **Стек:** Next.js 16 · shadcn/ui (radix-mira) · Tailwind v4 · TypeScript
>
> **Состояние:** Старт проекта, только вёрстка. Бэкенд, API, работа с БД — отсутствуют.
>
> **Главный принцип:** Каждый разработчик должен открыть этот документ, найти нужный раздел и сразу понять, куда класть новый код.

---

## Оглавление

1. [Дерево проекта](#1-дерево-проекта)
2. [Архитектурные слои и правила](#2-архитектурные-слои-и-правила)
   - [2.1 Роутинг (app/)](#21-роутинг-app)
   - [2.2 Компоненты](#22-компоненты)
   - [2.3 Бизнес-логика](#23-бизнес-логика)
   - [2.4 Работа с данными](#24-работа-с-данными)
   - [2.5 Типы](#25-типы)
   - [2.6 Статические ресурсы](#26-статические-ресурсы)
3. [Именование](#3-именование)
4. [Flow данных](#4-flow-данных)
5. [Типовые сценарии](#5-типовые-сценарии)

---

## 1. Дерево проекта

```
smetalabs/
├── .gitignore
├── .prettierrc                          # Конфиг Prettier (Tailwind-плагин)
├── .prettierignore
├── README.md                            # Технический README (шаблонный)
├── package.json                         # Зависимости и скрипты
├── pnpm-lock.yaml                       # Лок-файл (pnpm)
├── tsconfig.json                        # Конфиг TypeScript
├── next.config.mjs                      # Конфиг Next.js
├── postcss.config.mjs                   # Конфиг PostCSS (Tailwind)
│
├── app/                                 # Роутинг Next.js (App Router)
│   ├── layout.tsx                       # Корневой layout (шрифты, ThemeProvider, TooltipProvider)
│   ├── globals.css                      # Глобальные стили, CSS-переменные, импорты Tailwind/shadcn
│   ├── page.tsx                         # Корневая страница (редирект на /dashboard)
│   ├── favicon.ico                      # Фавиконка
│   │
│   ├── (auth)/                          # Route Group: страницы авторизации
│   │   ├── layout.tsx                   # Layout авторизации (центрированный, без sidebar)
│   │   ├── login/page.tsx               # Страница входа
│   │   ├── singup/page.tsx              # Страница регистрации
│   │   └── forgot-password/page.tsx     # Восстановление пароля
│   │
│   ├── (main)/                          # Route Group: основной интерфейс (с sidebar)
│   │   ├── layout.tsx                   # Layout с SidebarProvider, AppSidebar, SiteHeader
│   │   ├── page.tsx                     # Редирект на /dashboard
│   │   ├── dashboard/                   # Дашборд (главная страница после входа)
│   │   │   ├── page.tsx                 # Страница дашборда
│   │   │   └── data.json               # Мок-данные для таблицы
│   │   ├── projects/                    # Проекты
│   │   │   ├── page.tsx                 # Список проектов
│   │   │   └── [projectId]/            # Конкретный проект
│   │   │       ├── page.tsx             # Детальная страница проекта
│   │   │       └── estimates/          # Сметы проекта
│   │   │           └── [estimateId]/   # Конкретная смета
│   │   │               ├── layout.tsx   # Layout сметы (табы навигации + тулбар)
│   │   │               ├── page.tsx     # Основная вкладка сметы
│   │   │               ├── documents/  # Вкладка «Документы»
│   │   │               │   └── page.tsx
│   │   │               ├── execution/  # Вкладка «Выполнение»
│   │   │               │   └── page.tsx
│   │   │               ├── finances/   # Вкладка «Финансы»
│   │   │               │   └── page.tsx
│   │   │               └── purchases/  # Вкладка «Закупки»
│   │   │                   └── page.tsx
│   │   ├── directories/                # Справочники
│   │   │   ├── counterparties/page.tsx # Контрагенты
│   │   │   ├── materials/page.tsx      # Материалы
│   │   │   ├── suppliers/page.tsx      # Поставщики
│   │   │   └── works/page.tsx          # Виды работ
│   │   ├── procurements/               # Глобальные закупки (общий список с тулбаром и фильтрами)
│   │   │   └── page.tsx
│   │   ├── team/                       # Команда
│   │   │   └── page.tsx
│   │   └── templates/                  # Шаблоны смет
│   │       ├── page.tsx                # Список шаблонов
│   │       └── [templateId]/           # Конкретный шаблон
│   │           └── page.tsx
│   │
│   ├── admin/                           # Админ-панель (без группы роутов — отдельный layout)
│   │   └── page.tsx
│   │
│   └── api/                             # API-роуты (ЕЩЁ НЕ СОЗДАНЫ — появится при разработке)
│
├── types/                               # Общие типы
│   ├── purchase.ts                      #   Тип PurchaseRow
│   ├── execution.ts                     #   Тип ExecutionRow
│   ├── global-purchases.ts              #   Тип GlobalPurchaseRow
│   ├── estimate.ts                      #   Типы Work, Material
├── components/                          # Общие компоненты проекта
│   ├── ui/                              # ⛔ shadcn/ui компоненты — НЕ ТРОГАТЬ, не кастомизировать
│   │   ├── avatar.tsx                   #   (кроме случаев осознанного расширения через пропсы)
│   │   ├── badge.tsx
│   │   ├── breadcrumb.tsx
│   │   ├── button.tsx, button-group.tsx
│   │   ├── calendar.tsx
│   │   ├── card.tsx
│   │   ├── chart.tsx
│   │   ├── checkbox.tsx
│   │   ├── collapsible.tsx
│   │   ├── dialog.tsx
│   │   ├── drawer.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── editable-badge.tsx
│   │   ├── empty.tsx
│   │   ├── field.tsx
│   │   ├── frame.tsx                    #   Декоративная обёртка с dashed border
│   │   ├── framed-button.tsx            #   Button, обёрнутый в Frame
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── popover.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   ├── sidebar.tsx
│   │   ├── skeleton.tsx
│   │   ├── sonner.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── textarea.tsx
│   │   ├── toggle.tsx, toggle-group.tsx
│   │   ├── tooltip.tsx
│   │   └── aspect-ratio.tsx
│   ├── theme-provider.tsx               # Провайдер тёмной/светлой темы (next-themes)
│   └── nav-documents.tsx                # ⚠️ Боковая навигация «Documents» (временная, унаследована из шаблона)
│
├── features/                            # Фичи (бизнес-логика, сгруппированная по доменам)
│   ├── app-sidebar.tsx                  # Боковая панель приложения
│   ├── site-header.tsx                  # Верхняя панель (header)
│   ├── search-form.tsx                  # Форма поиска (в header)
│   ├── nav-main.tsx                     # Основная навигация sidebar
│   ├── nav-projects.tsx                 # Навигация «Проекты» в sidebar
│   ├── nav-secondary.tsx                # Вторичная навигация sidebar
│   ├── nav-user.tsx                     # Меню пользователя в sidebar
│   │
│   ├── auth/                            # Фича «Авторизация»
│   │   └── components/
│   │       ├── login-form.tsx           # Форма входа
│   │       ├── signup-form.tsx          # Форма регистрации
│   │       └── forgot-password-form.tsx # Форма восстановления
│   │
│   ├── dashboard/                       # Фича «Дашборд»
│   │   ├── chart-area-interactive.tsx   # Интерактивный график
│   │   ├── data-table.tsx              # Таблица данных
│   │   └── section-cards-dashboard.tsx  # Карточки статистики
│   │
│   ├── projects/                        # Фича «Проекты»
│   │   └── components/
│   │       ├── projects-view.tsx        # Представление списка проектов
│   │       ├── project-card.tsx         # Карточка одного проекта
│   │       └── section-cards.tsx        # Карточки статистики (раздел проектов)
│   │
│   ├── estimates/                       # Фича «Сметы» (✅ полная структура — декомпозирована)
│   │   ├── __mocks__/
│   │   │   └── estimates.ts             #   Мок-данные (работы + материалы)
│   │   ├── components/
│   │   │   └── estimate-navigation-tabs.tsx  # Табы навигации по смете
│   │   ├── hooks/
│   │   │   └── use-estimates.ts         #   Хук с состоянием (useState, useMemo)
│   │   ├── estimate-details/
│   │   │   └── components/
│   │   │       ├── estimate-section.tsx        # Секция сметы — композиция (112 строк)
│   │   │       ├── estimate-row.tsx            # Строка работы (collapsible + метрики + материалы)
│   │   │       ├── estimate-name.tsx           # Поле названия работы (textarea)
│   │   │       ├── estimate-value.tsx          # Бейдж «label: value»
│   │   │       ├── estimate-metric-group.tsx   # Группа метрик с заголовком
│   │   │       ├── estimate-material-card.tsx  # Карточка материала (Card + метрики)
│   │   │       ├── estimate-material-name.tsx  # Поле названия материала
│   │   │       ├── estimate-material-actions.tsx # Меню материала (Edit/Duplicate/Delete)
│   │   │       ├── estimate-work-number.tsx    # Номер работы (№ + value)
│   │   │       ├── estimate-work-actions.tsx   # Кнопки действий работы
│   │   │       ├── estimate-summary-value.tsx  # Сводные итоги (label + value)
│   │   │       ├── create-section-dialog.tsx   # Диалог создания секции
│   │   │       └── estimate-empty-state.tsx    # Пустое состояние сметы
│   │   └── estimate-tabs/
│   │       └── components/
│   │           ├── estimate-tab-placeholder.tsx # Заглушка для вкладки
│   │           └── estimate-tab-toolbar.tsx     # Тулбар вкладки сметы
│   │
│   ├── purchases/                       # Фича «Закупки» (✅ эталонная структура фичи)
│   │   ├── __mocks__/
│   │   │   └── purchases.ts             #   Мок-данные (10 позиций закупок)
│   │   ├── components/
│   │   │   └── purchases-view.tsx       #   Обёртка со скроллом (делегирует в PurchaseSection)
│   │   ├── hooks/
│   │   │   └── use-purchases.ts         #   Хук с состоянием (useState, useMemo)
│   │   └── purchase-details/
│   │       └── components/
│   │           ├── purchase-section.tsx  #   Композиция (хук → map → PurchaseRow)
│   │           ├── purchase-row.tsx      #   Строка закупки — собирает всё вместе
│   │           ├── purchase-name.tsx     #   Название позиции
│   │           ├── purchase-value.tsx    #   Бейдж «label: value» (Badge из shadcn/ui)
│   │           └── purchase-metric-group.tsx  # Группа Plan / Actual / Deviation
│   │
│   ├── execution/                       # Фича «Выполнение» (✅ эталонная структура, идентична purchases)
│   │   ├── __mocks__/
│   │   │   └── execution.ts             #   Мок-данные выполнения
│   │   ├── components/
│   │   │   └── execution-view.tsx       #   Обёртка со скроллом
│   │   ├── hooks/
│   │   │   └── use-execution.ts         #   Хук с состоянием (useState, useMemo)
│   │   └── execution-details/
│   │       └── components/
│   │           ├── execution-section.tsx  #   Композиция (хук → map → ExecutionRow)
│   │           ├── execution-row.tsx      #   Строка выполнения — собирает всё вместе
│   │           ├── execution-name.tsx     #   Название позиции
│   │           ├── execution-value.tsx    #   Бейдж «label: value»
│   │           └── execution-metric-group.tsx  # Группа метрик
│   │
│   ├── global-purchases/                # Фича «Глобальные закупки» (копия execution, с доработками)
│   │   ├── __mocks__/
│   │   │   └── global-purchases.ts      #   Мок-данные (10 материалов)
│   │   ├── hooks/
│   │   │   └── use-global-purchases.ts  #   Хук с состоянием
│   │   └── global-purchases-details/
│   │       └── components/
│   │           ├── global-purchases-view.tsx     # Обёртка со скроллом
│   │           ├── global-purchases-section.tsx  # Композиция (хук → map → Row)
│   │           ├── global-purchases-row.tsx      # Строка: наименование + стоимость + параметры + объект
│   │           ├── global-purchases-name.tsx     # Наименование + ед. изм
│   │           ├── global-purchases-metric-group.tsx  # Группа метрик
│   │           ├── global-purchases-value.tsx    # Бейдж «label: value»
│   │           └── global-purchases-toolbar.tsx  # Тулбар (поиск + кнопки + фильтры)
│   │
│   └── ... (новые фичи создавать здесь по доменному принципу)
│
├── hooks/                               # Общие хуки
│   └── use-mobile.ts                    # Хук определения мобильного устройства
│
├── lib/                                 # Утилиты и библиотечный код
│   ├── utils.ts                         #   cn() — мёрдж Tailwind-классов
│   ├── formatters.ts                    #   formatMoney(), formatConsumption(), parseDecimalInput()
│   └── calculations.ts                  #   getTotal() — вычисление суммы (qty × price)
│
├── public/                              # Статические файлы
│   └── images/
│       └── auth-bg.png                  # Фон страницы авторизации
│
└── docs/                                # Документация проекта
    ├── design-system.md                 # Дизайн-система (цвета, типографика, компоненты)
    └── filemap.md                       # ← этот файл
```

---

## 2. Архитектурные слои и правила

### 2.1 Роутинг (`app/`)

#### Когда создавать Route Group `(group)/`

Route Group используются для группировки страниц с общим layout **без влияния на URL**:

| Ситуация | Решение |
|---|---|
| Нужен другой layout (с sidebar / без) | Новая группа: `(auth)/`, `(main)/` |
| Нужен middleware/different providers | Новая группа |
| Просто логическая группировка страниц | **Не нужна группа** — достаточно вложенных папок |

**Пример:** `/admin` — сейчас лежит вне групп, т.к. имеет собственную структуру. Когда появится админский sidebar/layout — обернуть в `(admin)/`.

#### Когда создавать `layout.tsx`

| Ситуация | Решение |
|---|---|
| Общий UI для группы страниц (шапка, sidebar, табы) | `layout.tsx` |
| Вложенный навигационный контекст (табы внутри сметы) | `layout.tsx` на уровне `[estimateId]/` |
| Каждая страница уникальна, общего UI нет | **Не нужен** layout |

**Текущие layout'ы:**
- `app/layout.tsx` — шрифты, тема, tooltip-провайдер (глобально)
- `app/(auth)/layout.tsx` — центрирование формы входа
- `app/(main)/layout.tsx` — sidebar + header
- `app/(main)/projects/[projectId]/estimates/[estimateId]/layout.tsx` — табы навигации по вкладкам сметы

#### Когда создавать `page.tsx`

**Всегда** для маршрута, который должен рендерить контент. Один `page.tsx` на конечный URL-сегмент.

#### Шаблон `page.tsx`

```tsx
// ✅ Минимальная страница
export default function Page() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        {/* Контент страницы */}
      </div>
    </div>
  )
}
```

**Правила для page.tsx:**
- Экспорт по умолчанию — `export default function Page()`
- **page.tsx — это композиция**, а не логика. Только собирает фичи-компоненты
- Вся бизнес-логика — в `features/`
- Загрузка данных — через Server Components на уровне page (когда появится БД)

#### Динамические маршруты `[param]`

| URL | Файловая структура |
|---|---|
| `/projects` | `projects/page.tsx` |
| `/projects/42` | `projects/[projectId]/page.tsx` |
| `/projects/42/estimates/7` | `projects/[projectId]/estimates/[estimateId]/page.tsx` |

**Правила:**
- `[projectId]`, `[estimateId]` — kebab-case внутри скобок
- ID всегда строка в URL, преобразование в number — на уровне получения данных
- Для slug-ов (текстовых идентификаторов) — тоже `[slug]`

#### Параллельные маршруты и перехваты

**Пока не используются.** При появлении модалок с отдельным URL (например, создание проекта в модалке) — использовать `@modal` параллельный маршрут + `(.)` перехват.

---

### 2.2 Компоненты

#### Иерархия размещения

```
components/ui/       ← shadcn/ui (НЕ ТРОГАТЬ без веской причины)
components/          ← общие компоненты уровня приложения (theme-provider, etc.)
features/{domain}/   ← компоненты, специфичные для бизнес-домена
```

#### `components/ui/` — НЕ ТРОГАТЬ

Это сгенерированные shadcn/ui компоненты. **Кастомизация только через пропсы, `className` и CSS-переменные** — не через правку исходников.

**Исключение:** осознанное расширение пропсов (например, добавление `size` в `Avatar`) после обсуждения с командой.

#### `components/` — общие компоненты приложения

Сюда класть компоненты, которые:
- Используются **более чем в одной фиче**
- Не привязаны к конкретному бизнес-домену
- Являются инфраструктурными (провайдеры, обёртки)

**Что сейчас здесь:**
- `theme-provider.tsx` — ✅ правильно, инфраструктура
- `nav-documents.tsx` — ⚠️ временный, унаследован из шаблона. При рефакторинге → `features/`

**Что создавать здесь в будущем:**
- `components/error-boundary.tsx` — глобальный Error Boundary
- `components/loading-spinner.tsx` — общий спиннер загрузки
- `components/confirm-dialog.tsx` — переиспользуемый диалог подтверждения (если нужно)
- `components/page-header.tsx` — общий заголовок страницы

#### `features/{domain}/` — основной код

**Правило:** каждый бизнес-домен → отдельная папка в `features/`.

Структура фичи:
```
features/{domain}/
├── components/           # Компоненты фичи
├── {subdomain}/          # Поддомен (если фича большая)
│   └── components/
├── hooks/                # Хуки фичи (когда появятся)
└── utils.ts              # Утилиты фичи (когда появятся)
```

**Когда создавать подпапку в фиче:**
- Фича имеет несколько смысловых частей (например, `estimates/estimate-details/` и `estimates/estimate-tabs/`)
- Каждая часть содержит 2+ компонента
- Иначе — плоский список в `components/`

**Когда компонент класть рядом со страницей (co-location):**
- **НИКОГДА.** Все компоненты — в `features/`. App Router `page.tsx` не должен содержать логику, только композицию фич.

#### 💡 Пример: архитектура фичи `purchases` (эталон)

Фича «Закупки» — первая фича с полной многослойной структурой. Используй её как шаблон для всех новых фич.

```
features/purchases/
├── __mocks__/                         # Временные моки (удалятся после появления БД)
│   └── purchases.ts                   #   Массив PurchaseRow[]
│
├── components/                        # UI верхнего уровня (обёртки, view-компоненты)
│   └── purchases-view.tsx             #   Обёртка со скроллом. Только JSX + пропсы.
│                                      #   Не содержит бизнес-логики.
│
├── hooks/                             # Хуки фичи (состояние, useMemo, эффекты)
│   └── use-purchases.ts               #   Возвращает { purchases }
│                                      #   Пока — моки. Позже — запрос к API/БД.
│
└── purchase-details/                  # Поддомен «Детали закупки»
    └── components/                    #   Мелкие UI-компоненты поддомена
        ├── purchase-section.tsx        #     Композиция: хук → map → PurchaseRow
        ├── purchase-row.tsx            #     Строка: собирает имя + метрики
        ├── purchase-name.tsx           #     Название позиции (текст в рамке)
        ├── purchase-value.tsx          #     Бейдж «label: value» (использует Badge из ui/)
        └── purchase-metric-group.tsx   #     Группа метрик (Plan / Actual / Deviation)
```

**Поток данных внутри фичи:**

```
purchases-view.tsx                   ← page.tsx рендерит этот компонент
  └─→ PurchaseSection                 ← хук + map
        ├─→ usePurchases()            ← хук (сейчас моки, потом API)
        └─→ PurchaseRow (×N)          ← для каждой строки
              ├─→ PurchaseName        ← чистое отображение
              ├─→ PurchaseMetricGroup ← группировка метрик
              │     └─→ PurchaseValue (×N)  ← бейдж label:value
              ├─→ formatMoney()       ← lib/formatters.ts
              └─→ getTotal()          ← lib/calculations.ts
```

**Ключевые принципы:**
- **Один компонент — один файл.** Каждый `Purchase*` — в отдельном `.tsx`.
- **Именованные экспорты.** Никаких `export default` в фичах.
- **Минимум логики в компонентах.** Только JSX, пропсы и условный рендеринг.
- **Хуки — на своём уровне.** Компоненты не содержат useState/useMemo.
- **Моки — временные.** `__mocks__/` — признак этапа вёрстки. Удалятся при переходе к реальным данным.

#### 🗺️ Layers Rules — краткая таблица слоёв

| Слой | Назначение | Содержит | Где лежит |
|---|---|---|---|
| **`types/`** | Общие типы | TypeScript-типы, интерфейсы | `types/{domain}.ts` |
| **`lib/`** | Чистые утилиты (без React) | Форматирование, вычисления, хелперы | `lib/{name}.ts` |
| **`hooks/`** | Общие React-хуки | useMobile, useMediaQuery и т.д. | `hooks/{name}.ts` |
| **`components/`** | Инфраструктурные компоненты | Провайдеры, ErrorBoundary | `components/{name}.tsx` |
| **`components/ui/`** | shadcn/ui (не трогать) | Примитивы дизайн-системы | Только через CLI `npx shadcn add` |
| **`features/{f}/components/`** | UI фичи | JSX + пропсы, без бизнес-логики | `features/{f}/components/{name}.tsx` |
| **`features/{f}/hooks/`** | Хуки фичи | Состояние, useMemo, запросы | `features/{f}/hooks/{name}.ts` |
| **`features/{f}/__mocks__/`** | Моки (этап вёрстки) | Тестовые данные | `features/{f}/__mocks__/{name}.ts` |

**Правило выбора слоя:**
1. Тип используется в 2+ фичах? → `types/`
2. Чистая функция без React? → `lib/`
3. Хук с useState/useMemo/useEffect? → `hooks/` или `features/{f}/hooks/`
4. JSX с пропсами, без состояния? → `features/{f}/components/`
5. Провайдер/обёртка уровня приложения? → `components/`

---

### 2.3 Бизнес-логика

#### Где что лежит

| Что | Где | Пример |
|---|---|---|
| **Хуки** (useState/useEffect логика) | `hooks/` (общие) или `features/{domain}/hooks/` | `use-mobile.ts` |
| **Сервисы** (бизнес-операции) | `services/` (ЕЩЁ НЕТ) | `services/projects.ts` |
| **Утилиты** (чистые функции) | `lib/` (общие) или `features/{domain}/utils.ts` | `lib/utils.ts`, `lib/formatters.ts`, `lib/calculations.ts` |
| **Валидация** (Zod-схемы) | `lib/validations.ts` (общие) или `features/{domain}/validations.ts` | Zod схемы для форм |
| **Константы** | `lib/constants.ts` (общие) или `features/{domain}/constants.ts` | Значения enum, статусы |
| **Конфигурация** | `lib/config.ts` или переменные окружения | API URL, фича-флаги |

#### Правила

1. **Общие хуки → `hooks/`**, доменно-специфичные → `features/{domain}/hooks/`
2. **Формат:** каждый хук в отдельном файле, имя файла = имя хука: `use-project-list.ts`
3. **Утилиты:** чистые функции без сайд-эффектов. Если нужен доступ к БД/API — это сервис.

**Текущие утилиты `lib/`:**
- `utils.ts` — `cn()` мёрдж Tailwind-классов (clsx + tailwind-merge)
- `formatters.ts` — `formatMoney(value: number)` форматирование валюты (₽, разряды)
- `calculations.ts` — `getTotal(quantity, price)` умножение количества на цену

**Правило для `lib/`:**
- Только чистые функции. Нет импортов React, нет JSX, нет сайд-эффектов.
- Если утилита используется только в одной фиче → `features/{domain}/utils.ts`
- Если используется в 2+ фичах → `lib/`

---

### 2.4 Работа с данными

> **Текущее состояние:** Бэкенд и БД отсутствуют. Все данные — моковые. Правила ниже — как будет строиться при переходе к реальным данным.

#### Приоритетный подход: Server Components + Server Actions

```
1. Server Components — для получения данных на сервере и передачи в клиентские компоненты
2. Server Actions  — для мутаций (формы, кнопки действий)
3. API Routes      — только для внешних потребителей (вебхуки, мобильное приложение)
```

#### Где создавать

| Потребность | Где создавать |
|---|---|
| **Server Action** (мутация данных) | `app/actions/{domain}.ts` — рядом с роутами |
| **Прямой запрос к БД** | `lib/db/` — для Drizzle ORM; `lib/db/queries/{domain}.ts` — для запросов |
| **API Route** (внешний доступ) | `app/api/{domain}/route.ts` |
| **Сервисный слой** (бизнес-логика) | `services/{domain}.ts` |

#### Структура (план на будущее)

```
app/
├── actions/                    # Server Actions
│   ├── projects.ts             #   createProject, updateProject, deleteProject
│   ├── estimates.ts            #   createEstimate, addSection, updateSection
│   └── auth.ts                 #   login, signup, logout
│
├── api/                        # REST API (для внешних потребителей)
│   └── projects/
│       └── route.ts            #   GET /api/projects
│
lib/
├── db/                         # Работа с БД
│   ├── index.ts               #   Подключение (Drizzle)
│   ├── schema.ts               #   Схема таблиц
│   └── queries/                #   Типизированные запросы
│       ├── projects.ts
│       └── estimates.ts
│
services/                       # Бизнес-логика (когда появится потребность в слое абстракции)
├── projects.ts
└── estimates.ts
```

#### Правила выбора стратегии

| Ситуация | Использовать |
|---|---|
| Форма создания/редактирования на странице | **Server Action** |
| Список данных для SSR | **Server Component** с прямым запросом к БД |
| Мобильное приложение / внешний API | **API Route** |
| Реалтайм-обновления | **Server Actions + revalidatePath / revalidateTag** |
| Вебхуки от внешних сервисов | **API Route** |

---

### 2.5 Типы

> **Текущее состояние:** Директория `types/` создана. Содержит `purchase.ts` и `execution.ts`.

```
types/
├── purchase.ts             # PurchaseRow (id, title, planQuantity, planPrice, factQuantity, factPrice)
└── execution.ts            # ExecutionRow (структура идентична PurchaseRow)
```

#### План расширения

```
types/
├── index.ts                # Общие типы (User, Project, Estimate, etc.)
├── database.ts             # Типы из Drizzle (выводятся автоматически)
├── api.ts                  # Типы запросов/ответов API
└── {domain}.ts             # Доменно-специфичные типы
```

#### Правила

1. **Общие типы (User, Project, Estimate) → `types/index.ts`**
2. **Типы, используемые только внутри фичи → `features/{domain}/types.ts`**
3. **Типы из БД (Drizzle) → `types/database.ts` (выводятся из schema)**
4. **Не дублировать типы:** если тип используется в 2+ фичах — в `types/`
5. **Zod-схемы ≠ типы:** тип можно вывести из схемы `z.infer<typeof schema>`, схема — в `lib/validations.ts`
6. **Один домен = один файл:** `types/purchase.ts` для PurchaseRow, `types/estimate.ts` для Estimate и т.д.

---

### 2.6 Статические ресурсы

| Что | Куда |
|---|---|
| Изображения | `public/images/` |
| Иконки (кастомные) | `public/icons/` |
| Документы/файлы | `public/files/` |
| Шрифты | Подключать через `next/font` в `app/layout.tsx` (local или Google Fonts) |

---

## 3. Именование

### 3.1 Файлы

| Тип | Регистр | Пример |
|---|---|---|
| Компоненты (React) | **PascalCase** | `ProjectCard.tsx`, `LoginForm.tsx` |
| Хуки | **kebab-case** или **camelCase** | `use-mobile.ts` или `useMobile.ts` |
| Утилиты, сервисы, конфиги | **kebab-case** | `utils.ts`, `auth-service.ts`, `db-schema.ts` |
| Папки с компонентами | **kebab-case** или **camelCase** | `projects/`, `estimate-details/` |
| Route-сегменты | **kebab-case** | `forgot-password/`, `[projectId]/` |

### 3.2 Компоненты: `index.tsx` vs именованный файл

| Правило | Пример |
|---|---|
| **Именованный файл ВСЕГДА** | `project-card.tsx` ✅ |
| **НЕ использовать `index.tsx`** | `projects/index.tsx` ❌ |

**Причина:** `index.tsx` создаёт путаницу в IDE (10 вкладок с именем `index.tsx`). Именованные файлы — однозначная идентификация.

### 3.3 Директории

| Правило | Пример |
|---|---|
| Доменные фичи — **существительное во множественном числе** | `projects/`, `estimates/`, `purchases/` |
| Поддомены — **существительное в единственном** | `estimate-details/`, `purchase-details/` |
| Route-сегменты — **kebab-case, на английском** | `forgot-password/`, `estimate-tabs/` |
| Компонентные папки — всегда `components/` (множественное) | `features/projects/components/` |

### 3.4 Экспорты

| Правило | Пример |
|---|---|
| Компонент — **именованный экспорт** | `export function ProjectCard()` |
| Страница (page.tsx) — **экспорт по умолчанию** | `export default function Page()` |
| Layout — **экспорт по умолчанию** | `export default function MainLayout()` |
| Утилиты/хелперы — **именованный экспорт** | `export function cn()` |

---

## 4. Flow данных

### Схема слоёв

```
┌─────────────────────────────────────────────────────────┐
│                      БАЗА ДАННЫХ                         │
│                   (PostgreSQL + Drizzle)                  │
│                    lib/db/schema.ts                       │
│                    lib/db/queries/                        │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│  SERVER ACTIONS  │          │   API ROUTES     │
│ app/actions/     │          │ app/api/         │
│                  │          │                  │
│ • Мутации данных │          │ • Внешние        │
│ • Валидация (Zod)│          │   потребители    │
│ • revalidatePath │          │ • Вебхуки        │
└────────┬─────────┘          └────────┬─────────┘
         │                             │
         └──────────────┬──────────────┘
                        ▼
          ┌──────────────────────────┐
          │   REACT SERVER           │
          │   COMPONENTS (RSC)       │
          │                          │
          │ • Получение данных       │
          │ • Рендеринг на сервере   │
          │ • Передача данных вниз   │
          │   через props            │
          └────────────┬─────────────┘
                       │
                       ▼
          ┌──────────────────────────┐
          │   CLIENT COMPONENTS      │
          │   ("use client")          │
          │                          │
          │ • Интерактивность        │
          │ • Состояние (useState)   │
          │ • Браузерные API         │
          │ • Вызов Server Actions   │
          │   через startTransition  │
          └──────────────────────────┘
```

### Пояснение слоёв

#### 1. База данных
- **Драйвер:** Drizzle ORM
- **Схема:** `lib/db/schema.ts` — описание таблиц
- **Запросы:** `lib/db/queries/` — типизированные функции чтения
- **Не обращаться к БД из клиентских компонентов**

#### 2. Server Actions (`app/actions/`)
- **Для:** мутаций данных (создание, обновление, удаление)
- **Вызываются:** из Client Components через `startTransition` или `action={}`
- **Содержат:** валидацию (Zod), бизнес-логику, запись в БД, `revalidatePath`
- **Пример:** `createProject(data: FormData)` — создаёт проект, ревалидирует /projects

#### 3. API Routes (`app/api/`)
- **Для:** внешних потребителей (мобильное приложение, сторонние интеграции)
- **Только когда нужен REST API вне Next.js-приложения**
- Для внутренних нужд — **всегда Server Actions**

#### 4. React Server Components (по умолчанию)
- **Страницы (page.tsx) — всегда Server Components**
- Получают данные напрямую из БД (вызов функций из `lib/db/queries/`)
- Передают данные клиентским компонентам через **props**
- Не могут использовать хуки, useState, useEffect

#### 5. Client Components (`"use client"`)
- Директива `"use client"` в первой строке файла
- **Граница интерактивности:** useState, useEffect, onClick, браузерные API
- Вызывают Server Actions для мутаций
- **Не получают данные напрямую из БД** — только через props от RSC

### Принцип «сервер вниз»

```
Страница (RSC) получает данные из БД
   │
   ├─→ передаёт через props в FeatureComponent (RSC или Client)
   │      │
   │      ├─→ передаёт через props в дочерние Client Components
   │      │      │
   │      │      └─→ пользователь взаимодействует → вызывает Server Action
   │      │             │
   │      │             └─→ Server Action мутирует данные → revalidatePath
   │      │
   │      └─→ (ревалидация, страница перерендеривается с новыми данными)
```

### Почему так

1. **Меньше клиентского JS** — страницы рендерятся на сервере
2. **SEO** — контент доступен поисковикам
3. **Безопасность** — запросы к БД на сервере, не на клиенте
4. **Производительность** — данные ближе к месту использования

---

## 5. Типовые сценарии

### 5.1 Добавить новую страницу в (main)

```
1. Создать app/(main)/new-section/page.tsx
2. Создать features/new-section/components/new-section-view.tsx
3. Добавить ссылку в features/nav-main.tsx (или nav-secondary.tsx)
```

### 5.2 Добавить новую фичу (по образцу purchases)

```
1. Создать types/{domain}.ts               — типы (если нужны нескольким фичам)
2. Создать features/{domain}/__mocks__/    — мок-данные (временно, для вёрстки)
3. Создать features/{domain}/hooks/        — хук (состояние, сейчас моки, потом API)
4. Создать features/{domain}/components/   — view-компонент (обёртка)
5. При необходимости — поддомен:
   features/{domain}/{subdomain}/components/  — мелкие UI-компоненты
6. При необходимости — общие утилиты:
   lib/formatters.ts, lib/calculations.ts  — если функция нужна 2+ фичам
7. Страница в app/ только собирает фичи: <NewFeatureView />
```

**Пример для новой фичи «Поставщики»:**
```
types/supplier.ts                  ← тип Supplier
features/suppliers/
├── __mocks__/suppliers.ts         ← мок-список поставщиков
├── hooks/use-suppliers.ts         ← хук
├── components/suppliers-view.tsx   ← обёртка
└── supplier-details/
    └── components/
        ├── supplier-section.tsx
        ├── supplier-row.tsx
        └── ...
```

**Фича «Выполнение» (execution)** — создана по тому же эталону, что и `purchases`. Структура полностью идентична:
```
types/execution.ts                     ← тип ExecutionRow
features/execution/
├── __mocks__/execution.ts             ← мок-данные
├── hooks/use-execution.ts             ← хук
├── components/execution-view.tsx       ← обёртка
└── execution-details/components/      ← детальные компоненты
    ├── execution-section.tsx
    ├── execution-row.tsx
    ├── execution-name.tsx
    ├── execution-value.tsx
    └── execution-metric-group.tsx
```
При добавлении аналогичных фич (финансы, документы и т.д.) — использовать ту же структуру.

### 5.3 Добавить вкладку внутри сметы

```
1. Создать app/(main)/projects/[projectId]/estimates/[estimateId]/new-tab/page.tsx
2. Создать features/estimates/estimate-tabs/components/new-tab-content.tsx
3. Добавить значение таба в features/estimates/components/estimate-navigation-tabs.tsx
```

### 5.4 Создать форму с валидацией

```
1. Zod-схема в lib/validations.ts (или features/{domain}/validations.ts)
2. Клиентский компонент формы в features/{domain}/components/{domain}-form.tsx
3. Server Action в app/actions/{domain}.ts
4. page.tsx: <NewForm action={createAction} />
```

### 5.5 Подключить БД (в будущем)

```
1. lib/db/schema.ts — описать таблицы Drizzle
2. lib/db/index.ts — экспортировать клиент БД
3. lib/db/queries/{domain}.ts — запросы на чтение
4. app/actions/{domain}.ts — мутации
```

---

> **Главное правило:** Открыл этот документ → нашёл нужный раздел → понял, куда класть код → положил. Если не понял → обсуждаем с командой и дополняем документ.
