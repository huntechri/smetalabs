# SmetaLabs — Карта проекта (Filemap)

> **Стек:** Next.js 16 · Supabase Auth/DB · shadcn/ui (radix-mira) · Tailwind v4 · TypeScript · Zod
>
> **Состояние:** Фронтенд (вёрстка + моки) + Бэкенд (Supabase: DB, Auth, RBAC, API). Активная разработка.
>
> **Последнее обновление:** 2026-05-28
>
> **Главный принцип:** Каждый разработчик должен открыть этот документ, найти нужный раздел и сразу понять, куда класть новый код.
>
> **См. также:** [Knowledge Graph](knowledge-graph-methodology.md) — автоматическая карта связей (1502 связи, 20 типов, findings, readiness). [Скачать граф](https://raw.githubusercontent.com/huntechri/smetalabs/docs/update-knowledge-graph-v2/.understand-anything/knowledge-graph.json) (последняя версия из PR #190).

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
├── middleware.ts                        # Next.js middleware — проверка сессии Supabase, защита роутов
│
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
│   │   │                   └── page.tsx  # Серверный: params → PurchasesView(estimateId, projectId)
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
│   └── api/                             # REST API Route Handlers
│       ├── projects/[id]/estimate-records/[recordId]/
│       │   └── purchases/
│       │       ├── route.ts             #   GET закупок + POST создание (RPC)
│       │       └── [purchaseId]/route.ts  # PATCH обновление + DELETE архивация (RPC)
│       └── team/
│           ├── members/route.ts          # GET (список участников), POST (назначить роль), DELETE (снять роль)
│           └── roles/route.ts            # GET (список ролей), POST (создать роль)
│
├── types/                               # Общие типы
│   ├── purchase.ts                      #   Тип PurchaseRow
│   ├── execution.ts                     #   Тип ExecutionRow
│   ├── global-purchases.ts              #   Тип GlobalPurchaseRow
│   ├── estimate.ts                      #   Типы Work, Material
│   ├── directory-material.ts            #   Тип DirectoryMaterialRow
│   ├── directory-work.ts                #   Тип DirectoryWorkRow
│   ├── directory-supplier.ts            #   Тип DirectorySupplierRow
│   ├── directory-counterparty.ts        #   Тип DirectoryCounterpartyRow
│   │                                     #   + CounterpartyType, LegalStatus, BankDetails, PassportData
│   └── roles.ts                         #   RoleName, Role, PermissionKey (19 ключей), Permission,
│                                         #   UserRole, TeamMember, ROLE_PERMISSION_MATRIX (5×19 прав)
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
│   ├── account-settings/                # Фича «Настройки аккаунта» (✅ декомпозирована по 4-слойному стандарту)
│   │   ├── api/
│   │   │   ├── settings-actions.ts      #   Серверные экшены мутаций
│   │   │   ├── settings-client.ts       #   Клиент получения настроек (fetch)
│   │   │   └── settings-query-keys.ts   #   Ключи кэширования React Query
│   │   ├── model/
│   │   │   └── account-settings-model.ts #  Валидация, инициалы, часовые пояса, кандидаты
│   │   ├── application/
│   │   │   ├── use-settings.ts          #   Хук загрузки настроек
│   │   │   ├── use-update-profile.ts    #   Хук обновления профиля
│   │   │   ├── use-update-workspace.ts  #   Хук обновления воркспейса
│   │   │   ├── use-update-preferences.ts #  Хук обновления предпочтений
│   │   │   ├── use-update-notifications.ts # Хук обновления уведомлений
│   │   │   ├── use-security-actions.ts  #   Хук действий безопасности
│   │   │   └── use-sensitive-actions.ts #   Хук опасных действий воркспейса
│   │   └── ui/
│   │       ├── account-settings-view.tsx #  Основной экран настроек
│   │       ├── profile-settings-card.tsx #  Карточка настроек профиля
│   │       ├── workspace-settings-card.tsx # Карточка настроек воркспейса
│   │       ├── preferences-settings-card.tsx # Карточка настроек предпочтений
│   │       ├── notification-settings-card.tsx # Карточка настроек уведомлений
│   │       ├── security-settings-card.tsx # Карточка настроек безопасности
│   │       └── sensitive-actions-card.tsx # Карточка опасных действий
│   │
│   ├── auth/                            # Фича «Авторизация»
│   │   └── components/
│   │       ├── login-form.tsx           # Форма входа
│   │       ├── signup-form.tsx          # Форма регистрации
│   │       └── forgot-password-form.tsx # Форма восстановления
│   │
│   ├── dashboard/                       # Фича «Дашборд» (✅ декомпозирована по 4-слойному стандарту)
│   │   ├── api/
│   │   │   └── dashboard-api.ts         #   Реэкспорт запросов к проектам
│   │   ├── model/
│   │   │   └── dashboard-model.ts       #   Вычисления, диапазоны дат, границы графиков
│   │   ├── application/
│   │   │   ├── use-workspace-dashboard-stats.ts # Хук статистики TanStack Query
│   │   │   └── use-active-projects.ts   #   Хук проектов в работе
│   │   └── ui/
│   │       ├── chart-area-client.tsx    #   Ленивая загрузка
│   │       ├── chart-area-interactive.tsx # Интерактивный график Recharts
│   │       ├── data-table.tsx           #   Таблица проектов в работе
│   │       └── section-cards-dashboard.tsx # Карточки KPI воркспейса
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
│   │   │   └── purchases.ts             #   Мок-данные (10 позиций закупок, fallback для API)
│   │   ├── api/
│   │   │   ├── purchases-client.ts      #   API-клиент (GET/POST/PATCH/DELETE → /api/.../purchases)
│   │   │   └── purchases-query-keys.ts   #   Ключи кэширования React Query (list + mutations)
│   │   ├── components/
│   │   │   └── purchases-view.tsx       #   Обёртка со скроллом (принимает estimateId, projectId)
│   │   ├── hooks/
│   │   │   └── use-purchases.ts         #   Хук React Query (useQuery + useMutation + фильтрация)
│   │   ├── docs/
│   │   │   └── README.md                #   Документация модуля
│   │   └── purchase-details/
│   │       └── components/
│   │           ├── purchase-section.tsx  #   Композиция + тулбар + loading/empty/error состояния
│   │           ├── purchase-row.tsx      #   Строка закупки (read-only план, EditableBadge факт, архив)
│   │           ├── purchase-name.tsx     #   Название (без ед. измерения)
│   │           ├── purchase-unit.tsx     #   Единица измерения (w-full / sm:w-[76px])
│   │           ├── purchase-value.tsx    #   Бейдж с formatMoney + цвет отклонения (зелёный/красный)
│   │           ├── purchase-metric-group.tsx  # Группа Plan / Actual / Deviation
│   │           └── add-purchase-dialog.tsx  # Диалог добавления закупки (поиск из справочника)
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
│   │           ├── execution-name.tsx     #   Название позиции (без ед. измерения)
│   │           ├── execution-unit.tsx     #   Единица измерения (w-full / sm:w-[76px])
│   │           ├── execution-value.tsx    #   Бейдж «label: value»
│   │           └── execution-metric-group.tsx  # Группа метрик
│   │
│   ├── finances/                        # Фича «Финансы» (✅ бэкенд-интеграция, React Query)
│   │   ├── __mocks__/
│   │   │   └── finances.ts               #   Fallback-данные (используются если API недоступен)
│   │   ├── api/
│   │   │   └── finances-client.ts        #   API-клиент: GET/POST/PATCH/DELETE платежей
│   │   ├── hooks/
│   │   │   └── use-finances.ts           #   Хук (useQuery + useMutation + оптимистичный UI)
│   │   │                                  #   Оркестрирует: платежи + разделы сметы + закупки
│   │   ├── lib/
│   │   │   ├── utils.ts                   #   getSectionFactAmount, getSectionStatus
│   │   │   ├── date-utils.ts              #   toDateValue, toIsoDate, formatDisplayDate
│   │   │   └── finances-excel-exporter.ts #   Экспорт в Excel (ExcelJS, 8 колонок)
│   │   ├── types.ts                       #   PaymentStatus, SectionStatus, FinancePayment, FinanceSection
│   │   ├── components/
│   │   │   ├── finances-view.tsx          #   Основной view (KPI + таблица expandable-строки)
│   │   │   │                              #   Колонки: План · Факт · Затраты · Баланс · Статус · %
│   │   │   ├── finances-kpi-cards.tsx     #   4 KPI-карточки (Договор/Оплачено/Общий баланс/Закупки)
│   │   │   └── payment-create-dialog.tsx  #   Диалог добавления/редактирования платежа
│   │   └── docs/
│   │       └── README.md                  #   Документация модуля
│   │
│   ├── global-purchases/                # Фича «Глобальные закупки»
│   │   ├── api/
│   │   │   ├── global-purchases-client.ts    # API-клиент для глобальных закупок
│   │   │   ├── global-purchases-errors.ts    # Типизированные API-ошибки
│   │   │   └── global-purchases-query-keys.ts # Ключи запросов и теги кэша
│   │   ├── hooks/
│   │   │   └── use-global-purchases.ts  # Хук с состоянием и мутациями
│   │   ├── server/
│   │   │   ├── global-purchases.repository.ts # Репозиторий (динамические планы из смет)
│   │   │   ├── global-purchases.route-handlers.ts # Обработчики API-маршрутов
│   │   │   ├── global-purchases.schemas.ts   # Валидация Zod
│   │   │   ├── global-purchases.service.ts   # Сервисный слой, кэш, экспорт
│   │   │   └── global-purchases.export.ts    # Экспорт закупок в XLSX
│   │   └── global-purchases-details/
│   │       └── components/
│   │           ├── global-purchases-view.tsx     # Скролл-контейнер
│   │           ├── global-purchases-screen.tsx   # Главный экран
│   │           ├── global-purchases-section.tsx  # Композиция данных и диалогов
│   │           ├── global-purchases-list.tsx     # Список строк
│   │           ├── global-purchases-row.tsx      # Строка: наименование + параметры + объект + факт
│   │           ├── global-purchases-name.tsx     # Название позиции
│   │           ├── global-purchases-metric-group.tsx  # Группа метрик (План/Факт/Отклонение)
│   │           ├── global-purchases-value.tsx    # Бейдж «label: value»
│   │           ├── global-purchases-toolbar.tsx  # Тулбар (фильтры, добавление, экспорт)
│   │           ├── global-purchases-pagination.tsx # Постраничный переход
│   │           ├── global-purchase-archive-dialog.tsx # Диалог удаления/архивации
│   │           ├── global-purchase-material-dialog.tsx # Выбор материала из каталога
│   │           └── global-purchases-import-dialog.tsx # Диалог импорта закупок
│   │
│   ├── notifications/                   # Фича «Уведомления» (✅ декомпозирована по 4-слойному стандарту)
│   │   ├── api/
│   │   │   ├── notifications-client.ts  #   API-клиент (GET/POST → /api/notifications)
│   │   │   └── notifications-query-keys.ts # Ключи кэширования React Query
│   │   ├── model/
│   │   │   └── notifications-model.ts   #   Типы, относительное время, визуальный маппинг
│   │   ├── application/
│   │   │   └── use-notifications.ts     #   Хуки запросов, мутаций и realtime
│   │   ├── ui/
│   │   │   ├── notification-bell.tsx    #   Компонент колокольчика в шапке
│   │   │   ├── notification-item.tsx    #   Отображение одного события
│   │   │   └── notification-list.tsx    #   Список и табы (Непрочитанные / Все)
│   │   └── server/                      #   Бэкенд-слой (Repository, Service)
│   │
│   ├── directories/                     # Фича «Справочники» (общие тулбары для страниц справочников)
│   │   └── components/
│   │       ├── directories-toolbar.tsx   # Общий тулбар (search + actions)
│   │       ├── materials-toolbar.tsx     # Тулбар справочника материалов
│   │       ├── works-toolbar.tsx         # Тулбар справочника работ
│   │       ├── suppliers-toolbar.tsx     # Тулбар справочника поставщиков (+ Dialog)
│   │       └── counterparties-toolbar.tsx  # Тулбар справочника контрагентов (+ Dialog)
│   │
│   ├── directory-materials/             # Фича «Справочник материалов» (✅ эталонная структура)
│   │   ├── __mocks__/
│   │   │   └── directory-materials.ts   #   Мок-данные материалов
│   │   ├── components/
│   │   │   └── directory-materials-view.tsx  # Обёртка со скроллом
│   │   ├── hooks/
│   │   │   └── use-directory-materials.ts    # Хук (моки → API)
│   │   └── directory-materials-details/
│   │       └── components/
│   │           ├── directory-materials-section.tsx     # Композиция (хук → map → Row)
│   │           ├── directory-materials-row.tsx         # Строка материала
│   │           ├── directory-materials-name.tsx        # Название материала
│   │           ├── directory-materials-value.tsx       # Бейдж «label: value»
│   │           └── directory-materials-metric-group.tsx  # Группа метрик
│   │
│   ├── directory-works/                 # Фича «Справочник работ» (✅ эталонная структура)
│   │   ├── __mocks__/
│   │   │   └── directory-works.ts       #   Мок-данные работ
│   │   ├── components/
│   │   │   └── directory-works-view.tsx  # Обёртка со скроллом
│   │   ├── hooks/
│   │   │   └── use-directory-works.ts    # Хук (моки → API)
│   │   └── directory-works-details/
│   │       └── components/
│   │           ├── directory-works-section.tsx     # Композиция (хук → map → Row)
│   │           ├── directory-works-row.tsx         # Строка работы
│   │           ├── directory-works-name.tsx        # Название работы
│   │           ├── directory-works-value.tsx       # Бейдж «label: value»
│   │           └── directory-works-metric-group.tsx  # Группа метрик
│   │
│   ├── directory-suppliers/             # Фича «Справочник поставщиков» (✅ эталонная структура)
│   │   ├── __mocks__/
│   │   │   └── directory-suppliers.ts   #   Мок-данные поставщиков (10)
│   │   ├── components/
│   │   │   └── directory-suppliers-view.tsx  # Обёртка со скроллом
│   │   ├── hooks/
│   │   │   └── use-directory-suppliers.ts    # Хук (моки → API)
│   │   └── directory-suppliers-details/
│   │       └── components/
│   │           ├── directory-suppliers-section.tsx     # Композиция
│   │           ├── directory-suppliers-row.tsx         # Строка: название + цвет + статус + ИНН + телефон
│   │           ├── directory-suppliers-name.tsx        # Название поставщика
│   │           ├── directory-suppliers-value.tsx       # Бейдж «label: value»
│   │           ├── directory-suppliers-metric-group.tsx  # Группа метрик
│   │           └── directory-suppliers-create-dialog.tsx  # Диалог создания (5 полей + Select цвета)
│   │
│   ├── directory-counterparties/        # Фича «Справочник контрагентов» (✅ эталонная структура)
│   │   ├── __mocks__/
│   │   │   └── directory-counterparties.ts  #   Мок-данные контрагентов (10: 5 юрлиц + 5 физлиц)
│   │   ├── components/
│   │   │   └── directory-counterparties-view.tsx  # Обёртка со скроллом
│   │   ├── hooks/
│   │   │   └── use-directory-counterparties.ts    # Хук (моки → API)
│   │   └── directory-counterparties-details/
│   │       └── components/
│   │           ├── directory-counterparties-section.tsx     # Композиция
│   │           ├── directory-counterparties-row.tsx         # Строка: название + тип + статус + ИНН + телефон
│   │           ├── directory-counterparties-name.tsx        # Название контрагента
│   │           ├── directory-counterparties-value.tsx       # Бейдж «label: value»
│   │           ├── directory-counterparties-metric-group.tsx  # Группа метрик
│   │           └── directory-counterparties-create-dialog.tsx  # Диалог создания с условными полями
│   │                                                           # (юрлицо → реквизиты, физлицо → паспорт)
│   │
│   └── ... (новые фичи создавать здесь по доменному принципу)
│
├── hooks/                               # Общие хуки
│   └── use-mobile.ts                    # Хук определения мобильного устройства
│
├── lib/                                 # Утилиты и библиотечный код
│   ├── utils.ts                         #   cn() — мёрдж Tailwind-классов (clsx + tailwind-merge)
│   ├── formatters.ts                    #   formatMoney(), formatConsumption(), parseDecimalInput()
│   ├── calculations.ts                  #   getTotal() — вычисление суммы (qty × price)
│   │
│   ├── auth/                            # Аутентификация и авторизация
│   │   └── permissions.ts               #   RBAC: getUserRoles, getUserPermissions, hasPermission,
│   │                                     #   hasAnyPermission, hasAllPermissions, requirePermission,
│   │                                     #   canManageProjects/Estimates/Team, requireAuth (11 экспортов)
│   │
│   ├── supabase/                        # Клиенты Supabase
│   │   ├── server.ts                    #   Серверный клиент (Server Components, Route Handlers)
│   │   ├── client.ts                    #   Браузерный клиент (Client Components)
│   │   ├── middleware.ts                #   Реэкспорт createClient из server.ts
│   │   └── admin.ts                     #   Админ-клиент с service_role key (ТОЛЬКО сервер)
│   │
│   └── validators/                      # Zod-схемы валидации
│       └── team.ts                      #   AssignRoleSchema, CreateRoleSchema, RemoveRoleSchema
│
├── public/                              # Статические файлы
│   └── images/
│       └── auth-bg.png                  # Фон страницы авторизации
│
├── .env.local                           # Переменные окружения (Supabase URL, ANON_KEY, SERVICE_ROLE_KEY)
│
└── docs/                                # Документация проекта
    ├── design-system.md                 # Дизайн-система (цвета, типографика, компоненты)
    ├── architecture.md                  # Архитектура (стек, RBAC, аутентификация, БД)
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

**Замечание:** Маршруты `/templates/[templateId]` и `/team` ещё не имеют выделенных фич — их страницы используют inline-вёрстку или заглушки.

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
│   └── purchases.ts                   #   Массив PurchaseRow[] (с purchaseId)
│
├── api/                               # API-клиент (React Query)
│   ├── purchases-client.ts            #   fetch-функции: GET/POST/PATCH/DELETE
│   └── purchases-query-keys.ts        #   Ключи кэширования: list + mutations (add/update/archive)
│
├── components/                        # UI верхнего уровня (обёртки, view-компоненты)
│   └── purchases-view.tsx             #   Обёртка со скроллом. Только JSX + пропсы.
│                                      #   Не содержит бизнес-логики.
│
├── hooks/                             # Хуки фичи (React Query, мутации)
│   └── use-purchases.ts               #   Возвращает { purchases, addPurchase, updatePurchase, archivePurchase }
│                                      #   useQuery + useMutation с инвалидацией списка
│
└── purchase-details/                  # Поддомен «Детали закупки»
    └── components/                    #   Мелкие UI-компоненты поддомена
        ├── purchase-section.tsx        #     Композиция: тулбар + хук + map → PurchaseRow + диалог
        ├── purchase-row.tsx            #     Строка: имя + план(read-only) + факт(EditableBadge) + архив
        ├── purchase-name.tsx           #     Название позиции (без ед. измерения)
        ├── purchase-unit.tsx           #     Единица измерения (карточка w-full / sm:w-[76px])
        ├── purchase-value.tsx          #     Бейдж «label: value» (использует Badge из ui/)
        ├── purchase-metric-group.tsx   #     Группа метрик (Plan / Actual / Deviation)
        └── add-purchase-dialog.tsx     #     Диалог добавления: поиск из справочника материалов
```

**Поток данных внутри фичи:**

```
purchases-view.tsx                   ← page.tsx рендерит этот компонент
  └─→ PurchaseSection                 ← тулбар + хук + map + диалог
        ├─→ PurchaseToolbar            ← кнопка «Добавить закупку»
        ├─→ usePurchases()             ← хук (useQuery + useMutation)
        │     ├─→ fetchEstimatePurchases()  ← GET список
        │     ├─→ addProjectEstimatePurchase() ← POST создание
        │     ├─→ updateProjectEstimatePurchase() ← PATCH обновление
        │     └─→ archiveProjectEstimatePurchase() ← DELETE архивация
        ├─→ AddPurchaseDialog          ← диалог: поиск материалов + добавление
        │     └─→ fetchGlobalPurchaseMaterialOptions() ← справочник материалов
        └─→ PurchaseRow (×N)          ← для каждой строки
              ├─→ PurchaseName        ← чистое отображение названия
              ├─→ PurchaseUnit        ← отображение единицы измерения
              ├─→ PurchaseMetricGroup ← группировка метрик
              │     ├─→ PurchaseValue (×N, план)  ← статические бейджи
              │     └─→ EditableBadge (×N, факт)  ← редактируемые бейджи
              ├─→ DropdownMenu         ← меню «Удалить факт»
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
| **Валидация** (Zod-схемы) | `lib/validators/` (общие) или `features/{domain}/validators.ts` | `lib/validators/team.ts` |
| **Аутентификация/авторизация** | `lib/auth/` | `lib/auth/permissions.ts` |
| **Supabase-клиенты** | `lib/supabase/` | `server.ts`, `client.ts`, `admin.ts` |
| **Константы** | `lib/constants.ts` (общие) или `features/{domain}/constants.ts` | Значения enum, статусы |
| **Конфигурация** | `.env.local` или переменные окружения | Supabase URL, ANON_KEY, SERVICE_ROLE_KEY |

#### Правила

1. **Общие хуки → `hooks/`**, доменно-специфичные → `features/{domain}/hooks/`
2. **Формат:** каждый хук в отдельном файле, имя файла = имя хука: `use-project-list.ts`
3. **Утилиты:** чистые функции без сайд-эффектов. Если нужен доступ к БД/API — это сервис.

**Текущие утилиты `lib/`:**
- `utils.ts` — `cn()` мёрдж Tailwind-классов (clsx + tailwind-merge)
- `formatters.ts` — `formatMoney(value: number)` форматирование валюты (₽, разряды)
- `calculations.ts` — `getTotal(quantity, price)` умножение количества на цену

**Текущие модули `lib/` (не-утилиты):**
- `auth/permissions.ts` — RBAC-проверки (11 функций: getUserRoles, hasPermission, canManageTeam, и др.)
- `supabase/server.ts` — серверный Supabase-клиент (куки)
- `supabase/client.ts` — браузерный Supabase-клиент
- `supabase/middleware.ts` — реэкспорт createClient
- `supabase/admin.ts` — админ-клиент (service_role, только сервер)
- `validators/team.ts` — Zod-схемы: AssignRole, CreateRole, RemoveRole

**Правило для `lib/`:**
- Только чистые функции. Нет импортов React, нет JSX, нет сайд-эффектов.
- Если утилита используется только в одной фиче → `features/{domain}/utils.ts`
- Если используется в 2+ фичах → `lib/`

---

### 2.4 Работа с данными

> **Текущее состояние:** Supabase PostgreSQL (24 таблицы, RLS включен). Запросы через `@supabase/supabase-js` (без ORM). API Routes: `/api/team/members` и `/api/team/roles`. Фронтенд — моки в `__mocks__/`.

#### Приоритетный подход: Route Handlers + Supabase Client

```
1. Route Handlers (app/api/)  — для мутаций и чтения через Supabase-клиент
2. Server Components           — для SSR-страниц (когда появится потребность)
3. API Routes                  — для внешних потребителей
```

#### Где создавать

| Потребность | Где создавать |
|---|---|
| **Route Handler** (API) | `app/api/{domain}/route.ts` |
| **Supabase-клиент (сервер)** | `lib/supabase/server.ts` — `createClient()` |
| **Supabase-клиент (браузер)** | `lib/supabase/client.ts` — `createClient()` |
| **Supabase-клиент (админ)** | `lib/supabase/admin.ts` — `createAdminClient()` |
| **Проверка прав (RBAC)** | `lib/auth/permissions.ts` |
| **Валидация (Zod)** | `lib/validators/{domain}.ts` |

#### Структура (текущая)

```
app/
├── api/                        # REST API Route Handlers
│   └── team/
│       ├── members/route.ts    #   GET/POST/DELETE — управление ролями участников
│       └── roles/route.ts      #   GET/POST — список ролей и создание
│
lib/
├── supabase/                   # Supabase-клиенты
│   ├── server.ts               #   Серверный (куки)
│   ├── client.ts               #   Браузерный (NEXT_PUBLIC_ env)
│   ├── middleware.ts            #   Реэкспорт
│   └── admin.ts                #   Админ (service_role key)
│
├── auth/
│   └── permissions.ts          #   RBAC-проверки (11 функций)
│
└── validators/
    └── team.ts                 #   Zod-схемы ролей
```

#### База данных (Supabase & Drizzle)

Схема базы данных описывается через Drizzle ORM в `db/schema/`, а локальные миграции хранятся в репозитории в каталоге `db/migrations/` и применяются к базе данных. Ключевые таблицы public-схемы:

- **Ядро:** `profiles`, `roles` (5 записей), `permissions` (19 прав), `role_permissions` (61), `user_roles`, `user_settings`, `workspace_members`, `workspace_invitations`, `workspace_allowed_domains`
- **Справочники:** `directory_works` (723), `directory_materials` (35k+), `directory_suppliers`, `directory_counterparties`
- **Бизнес:** `projects`, `global_purchases`, `project_estimate_records`, `project_estimate_sections`, `project_estimate_works`, `project_estimate_materials`, `notifications`
- **Вспомогательные:** `work_aliases`, `work_keywords`, `*_import_jobs/rows`, `*_embeddings`

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

> **Текущее состояние:** 9 файлов типов. RBAC полностью типизирован (`roles.ts`).

```
types/
├── purchase.ts             # PurchaseRow (id, title, planQuantity, planPrice, factQuantity, factPrice)
├── execution.ts            # ExecutionRow (структура идентична PurchaseRow)
├── global-purchases.ts     # GlobalPurchaseRow
├── estimate.ts             # Work, Material (для смет)
├── directory-material.ts   # DirectoryMaterialRow
├── directory-work.ts       # DirectoryWorkRow
├── directory-supplier.ts   # DirectorySupplierRow
├── directory-counterparty.ts  # DirectoryCounterpartyRow, CounterpartyType, LegalStatus, BankDetails, PassportData
└── roles.ts                # RoleName, Role, PermissionKey (19 ключей), Permission, PermissionGroup,
                            #   UserRole, TeamMember, ROLE_PERMISSION_MATRIX, WRITE_ROLES, READ_ONLY_ROLES
```

#### Правила

1. **Общие типы (User, Project, Estimate) → `types/index.ts`**
2. **Типы, используемые только внутри фичи → `features/{domain}/types.ts`**
3. **Типы из БД (Supabase) → `types/{domain}.ts` (ручное описание, без Drizzle)**
4. **Не дублировать типы:** если тип используется в 2+ фичах — в `types/`
5. **Zod-схемы ≠ типы:** тип можно вывести из схемы `z.infer<typeof schema>`, схема — в `lib/validators/`
6. **Один домен = один файл:** `types/purchase.ts` для PurchaseRow, `types/estimate.ts` для Estimate и т.д.
7. **RBAC-типы — в `types/roles.ts`:** роли, права, матрица, TeamMember

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
│                (Supabase PostgreSQL, RLS)                 │
│                @supabase/supabase-js                      │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│  ROUTE HANDLERS  │          │   API ROUTES     │
│ app/api/         │          │ (внешние)         │
│                  │          │                  │
│ • Мутации данных │          │ • Мобильное      │
│ • Валидация (Zod)│          │   приложение     │
│ • RBAC-проверки  │          │ • Вебхуки        │
│ • Supabase SDK   │          │                  │
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
- **Драйвер:** `@supabase/supabase-js` (без ORM)
- **Таблицы:** 24 в public-схеме, RLS включен на всех
- **Запросы:** `supabase.from('table').select(...).eq(...)` — в Route Handlers
- **Не обращаться к БД из клиентских компонентов**

#### 2. Route Handlers (`app/api/`)
- **Для:** мутаций данных и API-эндпоинтов
- **Вызываются:** из Client Components через `fetch()`
- **Содержат:** валидацию (Zod), RBAC-проверки, запись в БД
- **Пример:** `POST /api/team/members` — назначает роль, проверяет `canManageTeam()`

#### 3. API Routes для внешних потребителей
- **Для:** мобильного приложения, сторонних интеграций
- **Только когда нужен REST API вне Next.js-приложения**

#### 4. React Server Components (по умолчанию)
- **Страницы (page.tsx) — всегда Server Components**
- Получают данные через `createClient()` из `lib/supabase/server`
- Передают данные клиентским компонентам через **props**
- Не могут использовать хуки, useState, useEffect

#### 5. Client Components (`"use client"`)
- Директива `"use client"` в первой строке файла
- **Граница интерактивности:** useState, useEffect, onClick, браузерные API
- Вызывают API через `fetch()` к Route Handlers или `supabase` из `lib/supabase/client`
- **Не получают данные напрямую из БД** — только через props от RSC или API

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
    ├── execution-unit.tsx
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

### 5.5 Добавить API-эндпоинт (по образцу team/)

```
1. types/{domain}.ts — типы данных
2. lib/validators/{domain}.ts — Zod-схемы валидации
3. app/api/{domain}/route.ts — Route Handler (GET/POST/DELETE)
4. В Route Handler:
   - createClient() из lib/supabase/server
   - RBAC-проверки из lib/auth/permissions
   - .from('table').select/insert/update/delete
```

---

> **Главное правило:** Открыл этот документ → нашёл нужный раздел → понял, куда класть код → положил. Если не понял → обсуждаем с командой и дополняем документ.
