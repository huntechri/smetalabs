# SmetaLabs — Карта проекта (Filemap)

> **Стек:** Next.js 16 · shadcn/ui (radix-mira) · Tailwind v4 · TypeScript
>
> **Состояние:** Активная разработка. Фронтенд на моках. Добавлен backend/auth слой: Drizzle ORM, Supabase Auth (Server Actions, middleware), RBAC-схема. Добавлена фича workspace-settings (team management).
>
> **Последнее обновление:** 2026-05-11 (feature/workspace-settings)
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
├── components.json                      # Конфиг shadcn/ui CLI
├── eslint.config.mjs                    # Конфиг ESLint
├── drizzle.config.ts                    # Конфиг Drizzle Kit (схема, миграции, БД)
├── proxy.ts                             # Middleware: Supabase Auth (сессии, редиректы)
│
├── app/                                 # Роутинг Next.js (App Router)
│   ├── layout.tsx                       # Корневой layout (шрифты, ThemeProvider, TooltipProvider)
│   ├── globals.css                      # Глобальные стили, CSS-переменные, импорты Tailwind/shadcn
│   ├── page.tsx                         # Корневая страница (редирект на /dashboard)
│   ├── favicon.ico                      # Фавиконка
│   │
│   ├── (auth)/                          # Route Group: страницы авторизации
│   │   ├── layout.tsx                   # Layout авторизации (центрированный, без sidebar)
│   │   ├── login/page.tsx               # Страница входа (Server Action: loginAction)
│   │   ├── signup/page.tsx              # Страница регистрации (Server Action: signupAction)
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
│   │   ├── templates/                  # Шаблоны смет
│   │   │   ├── page.tsx                # Список шаблонов
│   │   │   └── [templateId]/           # Конкретный шаблон
│   │   │       └── page.tsx
│   │   └── settings/                   # Настройки
│   │       └── account/
│   │           └── page.tsx            # Настройки аккаунта (AccountSettingsView)
│   │
│   ├── admin/                           # Админ-панель (без группы роутов — отдельный layout)
│   │   └── page.tsx
│   │
│   ├── auth/                            # Auth-роуты (callback OAuth / email confirm)
│   │   └── callback/
│   │       └── route.ts                 #   GET: verifyOtp + redirect (token_hash, type)
│   │
│   └── api/                             # API-роуты (ЕЩЁ НЕ СОЗДАНЫ — появится при разработке)
│
├── db/                                 # Работа с БД (Drizzle ORM + PostgreSQL)
│   ├── index.ts                         #   Клиент Drizzle (postgres-js, drizzle({schema}))
│   ├── seed.ts                          #   Заполнение RBAC-данными (роли, права, связи)
│   └── schema/
│       ├── index.ts                     #   Реэкспорт всех схем
│       ├── profiles.ts                  #   Таблица profiles (расширение auth.users)
│       └── rbac.ts                      #   Таблицы roles, permissions, role_permissions
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
│   │   ├── switch.tsx
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
│   │   ├── chart-area-client.tsx        # Клиентский график (Recharts, lazy-загрузка)
│   │   ├── chart-area-interactive.tsx   # Интерактивный график
│   │   ├── data-table.tsx              # Таблица данных
│   │   └── section-cards-dashboard.tsx  # Карточки статистики
│   │
│   ├── projects/                        # Фича «Проекты»
│   │   ├── hooks/
│   │   │   └── use-projects.ts          # Хук с фильтрацией и поиском
│   │   └── components/
│   │       ├── projects-view.tsx        # Представление списка проектов
│   │       ├── project-card.tsx         # Карточка одного проекта
│   │       ├── projects-toolbar.tsx     # Тулбар: поиск + фильтр по статусу + диалог создания
│   │       └── create-project-dialog.tsx # Диалог создания проекта
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
│   ├── access-control/                   # Фича «Права доступа — матрица RBAC» (UI-only)
│   │   ├── types.ts                      #   AccessRole, PermissionGroup, PermissionKey, RoleDefinition, PermissionDefinition
│   │   ├── __mocks__/
│   │   │   └── permissions.ts            #   Мок-роли, матрица прав по умолчанию
│   │   └── components/
│   │       └── permissions-matrix.tsx     #   Таблица прав (Table + Checkbox), кнопки Сбросить/Сохранить
│   │
│   ├── account-settings/               # Фича «Настройки аккаунта» (multi-tenant SaaS)
│   │                                   #
│   │                                   # Архитектура: 6 независимых карточек-компонентов, каждая —
│   │                                   # самодостаточный UI-блок с собственным мок-состоянием.
│   │                                   # AccountSettingsView собирает их в вертикальную композицию.
│   │                                   #
│   │                                   # Multi-tenant: Profile (личные данные пользователя) и
│   │                                   # Workspace (данные компании) — раздельные карточки.
│   │                                   # Labels нейтральные для multi-region SaaS.
│   │                                   #
│   │                                   # Каждая карточка: Card (shadcn) → поля (Input/Select/Switch)
│   │                                   # → Footer с Save-кнопкой (UI-only console.log).
│   │                                   # Уведомления: Switch (новый shadcn-примитив) для 6 триггеров.
│   │                                   # Sensitive: border-destructive, все кнопки — заглушки.
│   │                                   # Роут: settings/account, переход через sidebar (nav-user).
│   │
│   │   ├── types.ts                    #   AccountProfile, WorkspaceSettings, AccountPreferences...
│   │   ├── __mocks__/
│   │   │   └── account-settings.ts     #   Мок-данные всех 6 карточек
│   │   └── components/
│   │       ├── account-settings-view.tsx        # Композиция: сборка 6 карточек в gap-6
│   │       ├── profile-settings-card.tsx        # Аватар + поля + Select языка/таймзоны
│   │       ├── workspace-settings-card.tsx      # 2-колоночная сетка полей компании
│   │       ├── preferences-settings-card.tsx    # Тема/плотность/форматы дат и чисел
│   │       ├── notification-settings-card.tsx   # 6 Switch-переключателей уведомлений
│   │       ├── security-settings-card.tsx       # Пароль/2FA/сессии/последний вход
│   │       └── sensitive-actions-card.tsx       # border-destructive, 4 кнопки (1 disabled)
│   │
│   ├── workspace-settings/            # Фича «Workspace / Team Settings» (UI-only, multi-tenant)
│   │   ├── types.ts                     #   WorkspaceRole, WorkspaceMember, WorkspaceInvitation, WorkspaceOverview
│   │   ├── __mocks__/
│   │   │   └── workspace-settings.ts    #   Моки: 7 участников, 3 приглашения, 3 домена, overview
│   │   └── components/
│   │       ├── workspace-settings-view.tsx       # Композиция: сборка 8 секций
│   │       ├── workspace-overview-card.tsx       # Карточка обзора workspace
│   │       ├── workspace-members-table.tsx       # Таблица участников (Role Select, Status Badge, actions)
│   │       ├── invite-member-card.tsx            # Форма приглашения участника
│   │       ├── invite-link-card.tsx              # Invite-ссылка + Switch + Select
│   │       ├── allowed-domains-card.tsx          # Список разрешённых доменов + Input
│   │       ├── pending-invitations-table.tsx     # Таблица ожидающих приглашений
│   │       ├── workspace-roles-summary-card.tsx  # Сводка ролей с описаниями
│   │       └── workspace-actions-card.tsx        # Leave, Transfer, Archive, Remove
│   │
│   └── ... (новые фичи создавать здесь по доменному принципу)
│
├── hooks/                               # Общие хуки
│   └── use-mobile.ts                    # Хук определения мобильного устройства
│
├── lib/                                 # Утилиты и библиотечный код
│   ├── utils.ts                         #   cn() — мёрдж Tailwind-классов
│   ├── formatters.ts                    #   formatMoney(), formatConsumption(), parseDecimalInput()
│   ├── calculations.ts                  #   getTotal() — вычисление суммы (qty × price)
│   │
│   ├── supabase/                        #   Supabase-клиенты (пакет @supabase/ssr)
│   │   ├── server.ts                      #     createClient() — серверный клиент (cookies)
│   │   ├── client.ts                      #     createClient() — браузерный клиент
│   │   └── proxy.ts                       #     updateSession() — обновление сессий в middleware
│   │
│   └── auth/                            #   Серверные auth-утилиты
│       ├── actions.ts                     #     Server Actions: loginAction, signupAction, signOutAction
│       └── permissions.ts                 #     Проверки прав: getUserRoles, hasRole, canWrite, requireAuth
│
├── public/                              # Статические файлы
│   └── images/
│       └── auth-bg.png                  # Фон страницы авторизации
│
└── docs/                                # Документация проекта
    ├── design-system.md                 # Дизайн-система (цвета, типографика, компоненты)
    ├── designer-prompt.md               # Промпт для дизайнера
    ├── ui-audit.md                      # Аудит UI-компонентов
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

**Замечание:** Маршрут `/templates/[templateId]` ещё не имеет выделенной фичи — его страница использует inline-вёрстку или заглушку. `/team` теперь использует `WorkspaceSettingsView` из фичи `workspace-settings`.

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
| **`lib/supabase/`** | Supabase-клиенты | Серверный, браузерный, proxy (middleware) | `lib/supabase/{server,client,proxy}.ts` |
| **`lib/auth/`** | Серверная auth-логика | Server Actions (login, signup, logout), проверки прав | `lib/auth/{actions,permissions}.ts` |
| **`proxy.ts`** | Middleware (корень) | Supabase Auth: обновление сессий, редиректы, защита роутов | `proxy.ts` (в корне проекта) |
| **`db/`** | Работа с БД (Drizzle ORM) | Клиент, схема таблиц, seed-данные | `db/{index,schema/*,seed}.ts` |
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

> **Текущее состояние:** Слой БД (Drizzle ORM + PostgreSQL) и auth-слой (Supabase Auth) добавлены в `feature/auth-setup`. Схема RBAC и profiles готова. Server Actions для login/signup реализованы. Middleware защищает роуты.
>
> Остальные данные пока на моках. Правила ниже — целевая архитектура при полном переходе к реальным данным.

#### Приоритетный подход: Server Components + Server Actions

```
1. Server Components — для получения данных на сервере и передачи в клиентские компоненты
2. Server Actions  — для мутаций (формы, кнопки действий)
3. API Routes      — только для внешних потребителей (вебхуки, мобильное приложение)
```

#### Где создавать

| Потребность | Где создавать |
|---|---|
| **Server Action** (auth) | `lib/auth/actions.ts` — loginAction, signupAction, signOutAction (✅ реализовано) |
| **Server Action** (бизнес-данные) | `app/actions/{domain}.ts` — рядом с роутами (план) |
| **Прямой запрос к БД** | `db/` — клиент (`db/index.ts`), схема (`db/schema/`), seed (`db/seed.ts`) |
| **Auth-проверки** | `lib/auth/permissions.ts` — getUserRoles, hasRole, canWrite, requireAuth (✅ реализовано) |
| **Supabase-клиенты** | `lib/supabase/` — server.ts (cookies), client.ts (браузер), proxy.ts (middleware) |
| **API Route** (внешний доступ) | `app/api/{domain}/route.ts` |
| **Сервисный слой** (бизнес-логика) | `services/{domain}.ts` (план) |

#### Структура (текущая + план)

```
app/
├── actions/                    # Server Actions (план — бизнес-данные)
│   ├── projects.ts             #   createProject, updateProject, deleteProject
│   └── estimates.ts            #   createEstimate, addSection, updateSection
│
├── auth/                       # Auth-роуты (✅ реализовано)
│   └── callback/
│       └── route.ts            #   GET: OAuth + email confirm handler
│
├── api/                        # REST API (для внешних потребителей)
│   └── projects/
│       └── route.ts            #   GET /api/projects
│
db/                             # Работа с БД (✅ реализовано — основа)
├── index.ts                    #   Клиент Drizzle (postgres-js + schema)
├── seed.ts                     #   Seed RBAC-данных (роли, права)
├── drizzle.config.ts           #   (в корне проекта)
└── schema/
    ├── index.ts                #   Реэкспорт
    ├── profiles.ts             #   Таблица profiles
    └── rbac.ts                 #   Таблицы roles, permissions, role_permissions
│
lib/
├── supabase/                   # Supabase-клиенты (✅ реализовано)
│   ├── server.ts               #   createClient() — сервер (cookies)
│   ├── client.ts               #   createClient() — браузер
│   └── proxy.ts                #   updateSession() — middleware
│
├── auth/                       # Серверная auth-логика (✅ реализовано)
│   ├── actions.ts              #   loginAction, signupAction, signOutAction
│   └── permissions.ts          #   getUserRoles, hasRole, canWrite, requireAuth
│
services/                       # Бизнес-логика (план)
├── projects.ts
└── estimates.ts

proxy.ts                        # Middleware: Supabase Auth (✅ реализовано)
                                #   Защита роутов, редиректы, обновление сессий
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

> **Текущее состояние:** Директория `types/` содержит 9 файлов типов: `project.ts`, `purchase.ts`, `execution.ts`, `global-purchases.ts`, `estimate.ts`, `directory-material.ts`, `directory-work.ts`, `directory-supplier.ts`, `directory-counterparty.ts`. Типы workspace-settings (`WorkspaceRole`, `WorkspaceMember`, `WorkspaceInvitation`, `WorkspaceOverview`, `AllowedDomain`) лежат в `features/workspace-settings/types.ts` (используются только внутри фичи, правило #2).

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
│                   MIDDLEWARE (proxy.ts)                  │
│                                                          │
│  • Supabase Auth: обновление сессий (cookies)            │
│  • Защита роутов: /login /signup → только гостям         │
│  • Защита роутов: /dashboard /admin → только auth        │
│  • Пропуск: /auth/callback (OAuth / email confirm)       │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│                      БАЗА ДАННЫХ                         │
│                   (PostgreSQL + Drizzle)                  │
│                    db/schema/                             │
│                    db/index.ts                            │
│                    db/queries/ (план)                     │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│  SERVER ACTIONS  │          │   API ROUTES     │
│ lib/auth/actions │          │ app/api/         │
│ app/actions/     │          │                  │
│                  │          │ • Внешние        │
│ • Мутации данных │          │   потребители    │
│ • Валидация (Zod)│          │ • Вебхуки        │
│ • Аутентификация │          │                  │
│ • revalidatePath │          │                  │
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
          │ • Supabase Browser Client│
          └──────────────────────────┘
```

### Пояснение слоёв

#### 0. Middleware (`proxy.ts`)
- **Файл:** `proxy.ts` (корень проекта, Next.js Middleware)
- **Назначение:** Supabase Auth — обновление сессий через cookies
- **Защита роутов:**
  - `/login`, `/signup`, `/forgot-password` — только для неаутентифицированных (редирект → `/dashboard`)
  - `/admin` — только для аутентифицированных (редирект → `/login`)
  - `/auth/callback` — всегда разрешён (OAuth / email confirm)
  - Все остальные роуты (кроме `/`) — требуют аутентификации
- **Публичный роут:** `/` (корень) — открыт для developer navigator

#### 1. База данных
- **Драйвер:** Drizzle ORM
- **Клиент:** `db/index.ts` — drizzle(postgres(url), {schema})
- **Схема:** `db/schema/` — profiles.ts + rbac.ts (✅ реализовано)
- **Запросы:** `db/queries/` — типизированные функции чтения (план)
- **Seed:** `db/seed.ts` — RBAC-данные (роли, права, связи)
- **Конфиг:** `drizzle.config.ts` — Drizzle Kit (миграции, генерация)
- **Не обращаться к БД из клиентских компонентов**

#### 2. Server Actions (`lib/auth/actions.ts` + `app/actions/`)
- **Auth:** `lib/auth/actions.ts` — loginAction, signupAction, signOutAction (✅ реализовано)
  - Zod-валидация (Zod v4: `.issues` вместо `.errors`)
  - Динамический origin: `getOrigin()` из заголовков (Vercel preview + production)
  - Редирект после login/signup → `/dashboard`
  - Редирект после signOut → `/login`
- **Бизнес-данные:** `app/actions/` (план)
- **Вызываются:** из Client Components через `startTransition` или `action={}`
- **Содержат:** валидацию (Zod), бизнес-логику, запись в БД, `revalidatePath`

#### 2b. Auth-проверки (`lib/auth/permissions.ts`)
- `getUserRoles()` — роли текущего пользователя из таблицы `user_roles`
- `hasRole(role)`, `hasAnyRole(roles)` — проверка одной/нескольких ролей
- `canWrite()` — owner, admin, manager
- `canManageTeam()` — owner, admin
- `requireAuth()` — бросает ошибку если не аутентифицирован
- `requireRole(role)` — бросает ошибку если нет роли

#### 2c. Supabase-клиенты (`lib/supabase/`)
- `server.ts` — createClient() с серверными cookies (для RSC, Server Actions, Route Handlers)
- `client.ts` — createClient() с браузерным API (для Client Components)
- `proxy.ts` — updateSession(request) для middleware (`proxy.ts` в корне)

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
4. Страница автоматически защищена middleware (proxy.ts) — требует аутентификации
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

**Для auth-форм (✅ эталон — login, signup):**
```
1. Zod-схема в lib/auth/actions.ts (рядом с Server Action)
2. Клиентский компонент формы в features/auth/components/{name}-form.tsx
3. Server Action в lib/auth/actions.ts с "use server"
4. page.tsx: <Form action={action} />
5. Auth-проверки: lib/auth/permissions.ts
```

**Для бизнес-форм (план):**
```
1. Zod-схема в lib/validations.ts (или features/{domain}/validations.ts)
2. Клиентский компонент формы в features/{domain}/components/{domain}-form.tsx
3. Server Action в app/actions/{domain}.ts
4. page.tsx: <NewForm action={createAction} />
```

### 5.5 Подключить БД

**✅ Уже реализовано (основа):**
```
db/schema/profiles.ts    — таблица profiles (расширение auth.users)
db/schema/rbac.ts        — таблицы roles, permissions, role_permissions
db/index.ts              — клиент Drizzle (postgres-js, drizzle({schema}))
db/seed.ts               — заполнение RBAC-данными
drizzle.config.ts        — конфиг Drizzle Kit
```

**План расширения:**
```
1. db/schema/{domain}.ts — описать таблицы Drizzle для каждого домена
2. db/schema/index.ts — добавить реэкспорт
3. db/queries/{domain}.ts — запросы на чтение
4. app/actions/{domain}.ts — мутации
```

### 5.6 Аутентификация и защита роутов

**Как работает middleware (`proxy.ts`):**
```
proxy.ts (Next.js Middleware)
  └─→ lib/supabase/proxy.ts: updateSession(request)
        ├─→ Обновляет сессию через cookies (Supabase SSR)
        ├─→ /auth/callback — всегда пропускает (OAuth / email)
        ├─→ /login, /signup, /forgot-password — только гости
        │     └─→ если user → редирект /dashboard
        ├─→ /admin — только аутентифицированные
        │     └─→ если нет user → редирект /login
        └─→ Все остальные роуты — требуют аутентификации
              └─→ / — публичный (developer navigator)
```

**Как добавить новый защищённый роут:**
- Роуты в `(main)/` — защищены автоматически (middleware)
- Админ-роуты в `admin/` — защищены автоматически
- Публичный роут → добавить в `publicPaths` массива в `lib/supabase/proxy.ts`

**Как добавить проверку прав на странице:**
```tsx
// app/(main)/admin/page.tsx
import { requireRole } from "@/lib/auth/permissions"

export default async function AdminPage() {
  await requireRole("admin")
  return <AdminView />
}
```

**Auth-роуты (login/signup):**
- `/login` — форма входа, `loginAction` (Zod-валидация, Supabase Auth)
- `/signup` — форма регистрации, `signupAction`
- `/forgot-password` — форма восстановления (UI-only пока)
- `/auth/callback` — обработчик OAuth и email-подтверждений

---

> **Главное правило:** Открыл этот документ → нашёл нужный раздел → понял, куда класть код → положил. Если не понял → обсуждаем с командой и дополняем документ.
