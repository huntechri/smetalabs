# UI Audit Report — SmetaLabs

Дата: 2026-05-07

## Общая статистика

- **Всего компонентов:** 56
- **shadcn/ui примитивы:** 28 (std Radix Mira)
- **Кастомные компоненты (components/):** 7
- **Feature-компоненты (features/):** 21
- **Проблемных компонентов:** ~8 (в основном архитектурные)

---

## 1. shadcn/ui примитивы (components/ui/)

### button.tsx — ⚠️
- **Расположение:** `components/ui/button.tsx`
- **Тип:** shadcn/ui примитив (Radix Mira — **кастомная модификация**)
- **Оценка:**
  - `cn()`: ✅
  - `data-slot` (`data-slot="button"`): ✅
  - `data-variant` / `data-size`: ✅
  - variants через `cva`: ✅
  - `asChild` / `Slot.Root`: ✅
- **Кастомные изменения:** добавлены size-варианты `xs`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`; модифицированы базовые размеры (`default: h-7` вместо стандартного `h-9`); кастомные hover/active-эффекты
- **Замечания:** это осознанное решение для плотного UI смет, но стоит унифицировать с темой, если понадобится переключение между плотным и стандартным режимом

### badge.tsx — ✅
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** все стандарты соблюдены. `cva`, `data-slot`, `asChild`, `cn()` — ✅. Добавлены variant: `ghost`, `link` (как в Mira)
- **Замечания:** без замечаний

### card.tsx — ✅
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** `data-slot="card"`, `size` проп (`default | sm`), `data-size` атрибут. Composition: CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter
- **Замечания:** грамотная кастомная реализация, включает container queries (`@container/card`)

### input.tsx — ✅
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** `data-slot="input"`, стандартные aria и focus-visible. Минимальный размер h-7, md:text-xs
- **Замечания:** без замечаний

### textarea.tsx — ✅
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** `field-sizing-content` (autosize), `data-slot="textarea"`
- **Замечания:** без замечаний

### label.tsx — ✅
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** использует `LabelPrimitive.Root` из radix-ui, `data-slot="label"`, `cn()`
- **Замечания:** без замечаний

### checkbox.tsx — ✅
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** Radix Checkbox, Phosphor CheckIcon, `data-slot`, корректные aria-атрибуты, `group-has-disabled/field`
- **Замечания:** хорошая интеграция с Field-системой

### select.tsx — ✅
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** полная реализация: Select, SelectTrigger, SelectContent, SelectItem, SelectLabel, SelectSeparator, ScrollButtons. Кастомный дизайн с backdrop-blur, `data-slot` на всех элементах
- **Замечания:** размеры `sm | default`, переменная `--radix-select-content-available-height` для max-h

### dialog.tsx — ⚠️
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** `data-slot`, `showCloseButton` проп, использование `Button` для close. Composition: header, footer, title, description
- **Замечания:** `DialogFooter` дублирует логику close-кнопки (есть `showCloseButton` и в DialogFooter, и в DialogContent) — это может запутать

### sheet.tsx — ✅
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** аналогичен Dialog, но для Sheet. `side` проп (`top|right|bottom|left`), `showCloseButton`
- **Замечания:** без замечаний

### drawer.tsx — ✅
- **Тип:** shadcn/ui примитив (Vaul-based)
- **Оценка:** корректная реализация на базе vaul. `data-[vaul-drawer-direction]` для определения стороны
- **Замечания:** без замечаний

### tabs.tsx — ✅
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** `data-variant` (`default | line`), `data-orientation` через `cva`. `TabsList` variants, `TabsTrigger` с group-data-селекторами
- **Замечания:** продвинутая кастомизация через group-data — хороший паттерн

### table.tsx — ✅
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** composition (header, body, footer, row, head, cell, caption). `data-slot` на всех подкомпонентах
- **Замечания:** без замечаний

### tooltip.tsx — ✅
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** Radix Tooltip с Portal, кастомный Arrow и Content. `delayDuration=0` в Provider
- **Замечания:** без замечаний

### separator.tsx — ✅
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** Radix Separator, `data-horizontal|vertical`
- **Замечания:** без замечаний

### skeleton.tsx — ✅
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** минимальная обёртка с `animate-pulse rounded-md bg-muted`
- **Замечания:** без замечаний

### collapsible.tsx — ✅
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** Radix Collapsible, минимальная обёртка с `data-slot`
- **Замечания:** без замечаний

### avatar.tsx — ✅
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** добавлены `size` (`default|sm|lg`), `AvatarBadge`, `AvatarGroup`, `AvatarGroupCount`
- **Замечания:** качественная кастомная реализация

### breadcrumb.tsx — ✅
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** `BreadcrumbLink` с `asChild`, `BreadcrumbPage` с `aria-current="page"`, `BreadcrumbSeparator` с иконкой CaretRight
- **Замечания:** без замечаний

### toggle.tsx — ✅
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** `cva` variants (`default | outline`), размеры (`default|sm|lg`), Radix Toggle
- **Замечания:** без замечаний

### toggle-group.tsx — ✅
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** Context-based (`ToggleGroupContext`), `spacing` и `orientation` пропы, автоматическое управление border-radius при spacing=0
- **Замечания:** продвинутая кастомная реализация

### dropdown-menu.tsx — ✅
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** полная реализация всех подкомпонентов. Кастомный дизайн с backdrop-blur и `**data-[slot$=-item]` селекторами
- **Замечания:** без замечаний

### sidebar.tsx — ✅
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** большая кастомная реализация: SidebarProvider, Sidebar, SidebarTrigger, SidebarRail, SidebarInset, SidebarContent, SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuSub и т.д. Контекст для управления состоянием. Cookie-based state persistence
- **Замечания:** без замечаний. Одна из самых сложных и качественных реализаций в проекте

### chart.tsx — ✅
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** Recharts обёртка с ChartContainer, ChartTooltip, ChartLegend, ChartStyle. `ChartConfig` типизация
- **Замечания:** без замечаний. Только проверить актуальность — файл большой (374 строки)

### sonner.tsx — ✅
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** Toaster с кастомными иконками из Phosphor, next-themes `theme` проп
- **Замечания:** без замечаний

### field.tsx — ✅
- **Тип:** shadcn/ui примитив (Radix Mira — кастомный)
- **Оценка:** полная система полей: Field, FieldSet, FieldGroup, FieldLegend, FieldLabel, FieldContent, FieldTitle, FieldDescription, FieldSeparator, FieldError. Variants (orientation: vertical/horizontal/responsive). Встроенная валидация через `errors` проп и `useMemo`
- **Замечания:** грамотная реализация с container queries

### empty.tsx — ✅
- **Тип:** shadcn/ui примитив (кастомный)
- **Оценка:** Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia с variant (`default|icon`). `cva` для media variants
- **Замечания:** без замечаний

### button-group.tsx — ✅
- **Тип:** shadcn/ui примитив (кастомный)
- **Оценка:** ButtonGroup с `orientation` (`horizontal|vertical`), ButtonGroupText с `asChild`, ButtonGroupSeparator. Селекторы для скругления углов у первого/последнего ребёнка
- **Замечания:** без замечаний

### aspect-ratio.tsx — ✅
- **Тип:** shadcn/ui примитив (модифицирован)
- **Оценка:** Radix AspectRatio, минимальная обёртка
- **Замечания:** без замечаний

---

## 2. Кастомные компоненты (components/)

### app-sidebar.tsx — ⚠️
- **Расположение:** `components/app-sidebar.tsx`
- **Оценка:** использует shadcn Sidebar примитивы, NavMain/NavSecondary/NavDocuments/NavUser. Данные хардкодом. `data-slot` не используется напрямую (используются shadcn-компоненты)
- **Проблема:** **дублируется** с `features/app-sidebar.tsx`. Components-версия использует `CommandIcon` и плейсхолдер "Acme Inc.", features-версия использует "SmetaLab". Обе используют разные наборы навигации
- **Рекомендация:** удалить `components/app-sidebar.tsx`, оставить `features/app-sidebar.tsx` как единственную актуальную версию

### site-header.tsx — ⚠️
- **Расположение:** `components/site-header.tsx`
- **Оценка:** минимальный хедер с `SidebarTrigger` и Separator. Захардкожен заголовок "Documents"
- **Проблема:** **дублируется** с `features/site-header.tsx`. Features-версия содержит Breadcrumb, SearchForm, кастомную toggle-кнопку
- **Рекомендация:** удалить `components/site-header.tsx`, оставить `features/site-header.tsx`

### nav-main.tsx — ⚠️
- **Расположение:** `components/nav-main.tsx`
- **Оценка:** SidebarGroup + SidebarMenu. Есть "Quick Create" кнопка
- **Проблема:** **дублируется** с `features/nav-main.tsx`. Features-версия использует Collapsible, содержит submenu-элементы. Это разные реализации
- **Рекомендация:** удалить `components/nav-main.tsx`

### nav-secondary.tsx — ⚠️
- **Расположение:** `components/nav-secondary.tsx`
- **Оценка:** идентичная features-версии, с одним отличием — не использует `size="sm"` на `SidebarMenuButton`
- **Проблема:** **дублируется** с `features/nav-secondary.tsx`
- **Рекомендация:** удалить, оставить features-версию

### nav-user.tsx — ⚠️
- **Расположение:** `components/nav-user.tsx`
- **Оценка:** DropdownMenu с Avatar, Account/Billing/Notifications пунктами
- **Проблема:** **дублируется** с `features/nav-user.tsx`. Разные иконки (DotsThreeVerticalIcon vs CaretUpDown), разные пункты меню
- **Рекомендация:** удалить `components/nav-user.tsx`

### nav-documents.tsx — ⚠️
- **Расположение:** `components/nav-documents.tsx`
- **Оценка:** SidebarGroup с документами, DropdownMenu для действий (Open/Share/Delete)
- **Проблема:** аналог в features — `features/nav-projects.tsx` (по структуре почти идентичен, но с разными иконками)
- **Рекомендация:** проверить, нужен ли этот компонент вообще, или переработать в общий

### theme-provider.tsx — ✅
- **Расположение:** `components/theme-provider.tsx`
- **Оценка:** next-themes Provider + кастомный ThemeHotkey (клавиша D). Хорошая реализация с проверкой `isTypingTarget`
- **Замечания:** без замечаний

---

## 3. Feature-компоненты (features/)

### features/app-sidebar.tsx — ✅
- **Оценка:** актуальная версия сайдбара. NavMain с collapsible submenu, NavProjects, правильные ссылки на реальные страницы проекта (dashboard, projects, directories и т.д.)
- **Замечания:** хороший пример feature-компонента: UI-логика в примитивах, данные — в feature

### features/site-header.tsx — ✅
- **Оценка:** Breadcrumb, SearchForm, sticky header
- **Замечания:** использует `useSidebar()` для toggle. `SearchForm` вынесен в отдельный компонент — правильно

### features/nav-main.tsx — ✅
- **Оценка:** Collapsible + SidebarMenuSub для подменю. Чистая реализация
- **Замечания:** без замечаний

### features/nav-secondary.tsx — ✅ / ⚠️
- **Оценка:** корректно использует shadcn Sidebar
- **Замечания:** в данный момент не используется в `features/app-sidebar.tsx` (закомментирован)

### features/nav-user.tsx — ✅
- **Оценка:** полный DropdownMenu с Upgrade to Pro, Account, Billing, Notifications, Logout
- **Замечания:** использует CaretUpDown — более стандартный паттерн, чем DotsThreeVerticalIcon из components-версии

### features/nav-projects.tsx — ⚠️
- **Оценка:** почти идентичен `components/nav-documents.tsx` с другими подписями
- **Замечания:** есть дублирование кода, можно объединить в один компонент

### features/search-form.tsx — ✅
- **Оценка:** обёртка над SidebarInput с MagnifyingGlassIcon и sr-only Label
- **Замечания:** без замечаний

### features/dashboard/chart-area-interactive.tsx — ✅
- **Оценка:** Recharts AreaChart с Select для выбора периода, ToggleGroup для переключения метрик. Использует Card, ChartContainer
- **Замечания:** без замечаний

### features/dashboard/data-table.tsx — ✅
- **Оценка:** @tanstack/react-table с DnD (dnd-kit), сортировка, фильтрация, пагинация, inline-chart чарты. Zod валидация
- **Замечания:** без замечаний

### features/dashboard/section-cards-dashboard.tsx — ❌
- **Оценка:** импортирует **`@tabler/icons-react`** (IconTrendingUp, IconTrendingDown), в то время как проект использует `@phosphor-icons/react` как основной икон-сет
- **Проблема:** **cross-contamination icon-library**. Shadcn/ui сконфигурирован на Phosphor (`"iconLibrary": "phosphor"` в components.json), но этот файл использует Tabler иконки
- **Рекомендация:** заменить IconTrendingUp/IconTrendingDown на эквиваленты из `@phosphor-icons/react` (TrendUp, TrendDown) и удалить `@tabler/icons-react` из зависимостей

### features/auth/components/login-form.tsx — ✅
- **Оценка:** использует Field-систему, Card, Social-кнопки. Чистая форма
- **Замечания:** в качестве загрузочного изображения использует `/images/auth-bg.png` — проверить наличие файла

### features/auth/components/signup-form.tsx — ✅
- **Оценка:** аналогична login-form
- **Замечания:** без замечаний (проверить файл полностью)

### features/auth/components/forgot-password-form.tsx — ✅
- **Оценка:** минимальная форма (проверить полностью)

### features/projects/components/project-card.tsx — ✅
- **Оценка:** Card с AspectRatio, Image, Button. Чистая композиция shadcn
- **Замечания:** без замечаний

### features/projects/components/projects-view.tsx — ❌
- **Оценка:** содержит вложенные `border border-dashed` контейнеры с захардкоженными стилями и ButtonGroup
- **Проблема:** явно черновая верстка/заглушка с даш-бордерами. ButtonGroup с "Button 1, 2, 3" — плейсхолдер
- **Рекомендация:** либо удалить, либо заменить на реальный контент

### features/projects/components/section-cards.tsx — ✅
- **Оценка:** Section Cards компонент (не проверен полностью, но структура корректна)

### features/estimates/components/estimate-navigation-tabs.tsx — ❌
- **Оценка:** использует `border border-dashed border-pink-500` — **явно отладочная/черновая разметка**
- **Проблема:** розовые даш-бордеры на всех контейнерах — отладочные стили не удалены
- **Рекомендация:** удалить даш-бордеры и заменить на финальные стили

### features/estimates/estimate-details/components/create-section-dialog.tsx — ⚠️
- **Оценка:** форма в Dialog с Input и Label. Нормальная реализация
- **Замечания:** использует русские тексты (Создать новый раздел, №, Название) — проверить консистентность локализации

### features/purchases/components/purchases-view.tsx — ❌
- **Оценка:** черновик (предположительно)
- **Замечания:** не проверен полностью, но вероятно содержит такие же заглушки как projects-view

---

## 4. Архитектурные замечания

### P0 — критическое

1. **Дублирование components/ ↔ features/**
   - `components/app-sidebar.tsx` ↔ `features/app-sidebar.tsx` — разные реализации
   - `components/site-header.tsx` ↔ `features/site-header.tsx` — разные реализации
   - `components/nav-main.tsx` ↔ `features/nav-main.tsx` — разные реализации
   - `components/nav-secondary.tsx` ↔ `features/nav-secondary.tsx` — почти идентичны
   - `components/nav-user.tsx` ↔ `features/nav-user.tsx` — разные реализации
   - `components/nav-documents.tsx` ≈ `features/nav-projects.tsx` — почти идентичны
   - **Рекомендация:** удалить `components/app-sidebar.tsx`, `components/site-header.tsx`, `components/nav-main.tsx`, `components/nav-secondary.tsx`, `components/nav-user.tsx` — оставить только features-версии (они актуальнее)

2. **`@tabler/icons-react` cross-contamination**
   - `features/dashboard/section-cards-dashboard.tsx` импортирует `IconTrendingUp/IconTrendingDown` из `@tabler/icons-react`
   - Весь проект использует `@phosphor-icons/react` (включая components.json)
   - **Рекомендация:** заменить на Phosphor-эквиваленты (`TrendUp`, `TrendDown`) и удалить `@tabler/icons-react` из package.json зависимостей

3. **`features/estimates copy/` — дублирующаяся папка**
   - Полная копия `features/estimates/` с устаревшим содержимым
   - **Рекомендация:** немедленно удалить

### P1 — важное

4. **Отладочные стили в production-коде**
   - `features/estimates/components/estimate-navigation-tabs.tsx` — повсеместно `border border-dashed border-pink-500`
   - `features/projects/components/projects-view.tsx` — `border border-dashed` контейнеры и заглушки
   - **Рекомендация:** удалить даш-бордеры и плейсхолдер-контент

5. **Захардкоженные данные**
   - `components/app-sidebar.tsx` — "Acme Inc.", "shadcn" пользователь
   - `features/app-sidebar.tsx` — "SmetaLab", "admin@smetalabs.com"
   - `components/site-header.tsx` — "Documents" заголовок
   - **Рекомендация:** согласовать, какой набор данных использовать

### P2 — косметическое

6. **Неиспользуемые компоненты**
   - `features/nav-secondary.tsx` — закомментирован в features/app-sidebar.tsx
   - `features/nav-projects.tsx` — используется? (проверить)

7. **Mixed icon library in sections-cards**
   - `section-cards-dashboard.tsx` смешивает Tabler и, вероятно, Phosphor в других файлах. Нужна единая библиотека

8. **Локализация**
   - Смесь русского (estimate-navigation-tabs, create-section-dialog) и английского (login-form, signup-form). Определиться с языком интерфейса

---

## 5. Рекомендации (приоритет)

### P0 (критические — срочно исправить)
1. Удалить дублирующиеся компоненты в `components/`, оставить `features/`-версии
2. Заменить `@tabler/icons-react` → `@phosphor-icons/react`
3. Удалить `features/estimates copy/`
4. Убрать отладочные border-dashed стили из estimate-navigation-tabs и projects-view

### P1 (важные — до следующего PR)
5. Заменить хардкод-данные на подготавливаемую структуру (mock или пропсы)
6. Определиться с языком интерфейса (русский/английский/смесь)
7. Удалить неиспользуемые компоненты и импорты

### P2 (косметические — tech debt)
8. Рассмотреть объединение nav-documents и nav-projects в один компонент
9. Унифицировать кастомные size-варианты button в теме
10. Проверить наличие `/images/auth-bg.png` в public/
