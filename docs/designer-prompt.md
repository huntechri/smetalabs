# Prompt for Designer Agent — UI Audit

## Context

Проект **SmetaLabs** — production multi-tenant SaaS для строительных смет. Репозиторий: `/home/openclaw/.openclaw/workspace/smetalabs`.

**Стек:** Next.js App Router, TypeScript, shadcn/ui (Radix Mira style), Tailwind CSS v4, Phosphor icons.

**Архитектура:**
- `components/ui/` — shadcn/ui примитивы
- `components/` — кастомные компоненты (app-sidebar, nav-*, site-header, theme-provider)
- `features/*/components/` — бизнес-компоненты фич
- `lib/` — утилиты (cn())
- `app/` — роуты, layout

**Статус:** Только вёрстка, без БД. Проект на начальном этапе.

---

## Задача

Провести полный аудит UI и задокументировать состояние.

### Шаг 1. Инспекция

Выполни в терминале:

```bash
# Структура компонентов
find /home/openclaw/.openclaw/workspace/smetalabs/components -type f | sort

# Структура фич
find /home/openclaw/.openclaw/workspace/smetalabs/features -type f | sort

# Все страницы
find /home/openclaw/.openclaw/workspace/smetalabs/app -name '*.tsx' | sort

# Корневые файлы
ls -la /home/openclaw/.openclaw/workspace/smetalabs/
cat /home/openclaw/.openclaw/workspace/smetalabs/components.json
cat /home/openclaw/.openclaw/workspace/smetalabs/package.json
```

### Шаг 2. Чтение компонентов

Прочитай все следующие файлы и задокументируй каждый:

**shadcn/ui примитивы (components/ui/):**
- `button.tsx`, `badge.tsx`, `card.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`
- `dialog.tsx`, `sheet.tsx`, `drawer.tsx`, `dropdown-menu.tsx`
- `tabs.tsx`, `table.tsx`, `checkbox.tsx`, `label.tsx`
- `tooltip.tsx`, `separator.tsx`, `skeleton.tsx`, `collapsible.tsx`
- `avatar.tsx`, `breadcrumb.tsx`, `toggle.tsx`, `toggle-group.tsx`
- `sidebar.tsx`, `chart.tsx`, `sonner.tsx`, `field.tsx`, `empty.tsx`, `button-group.tsx`, `aspect-ratio.tsx`

**Кастомные компоненты (components/):**
- `app-sidebar.tsx`, `site-header.tsx`, `theme-provider.tsx`
- `nav-main.tsx`, `nav-secondary.tsx`, `nav-user.tsx`, `nav-documents.tsx`

**Фичи (features/):**
- `features/app-sidebar.tsx`
- `features/site-header.tsx`
- `features/nav-main.tsx`, `features/nav-secondary.tsx`, `features/nav-user.tsx`
- `features/search-form.tsx`
- `features/dashboard/chart-area-interactive.tsx`
- `features/dashboard/data-table.tsx`
- `features/dashboard/section-cards-dashboard.tsx`
- `features/projects/components/project-card.tsx`
- `features/projects/components/projects-view.tsx`
- `features/auth/components/login-form.tsx`
- `features/auth/components/signup-form.tsx`
- `features/auth/components/forgot-password-form.tsx`
- `features/estimates/components/estimate-navigation-tabs.tsx`
- `features/estimates/estimate-details/components/estimate-empty-state.tsx`
- `features/estimates/estimate-details/components/estimate-section.tsx`
- `features/estimates/estimate-details/components/create-section-dialog.tsx`
- `features/estimates/estimate-tabs/components/estimate-tab-placeholder.tsx`
- `features/estimates/estimate-tabs/components/estimate-tab-toolbar.tsx`
- `features/purchases/components/purchases-view.tsx`
- `features/purchases/purchase-details/components/purchase-section.tsx`

**Корневые:**
- `app/layout.tsx`, `app/globals.css`
- `lib/utils.ts`

### Шаг 3. Критерии оценки

Для каждого компонента проверь:

1. **shadcn/ui примитивы:**
   - Используется ли `cn()` для merge классов
   - Используются ли `data-slot` атрибуты
   - Есть ли правильные variants через cva
   - Используется ли `Slot`/`asChild` где нужно
   - Нет ли дублирования стилей, которые можно получить из shadcn-пропсов
   - Соответствует ли код стандартной установке через `npx shadcn add` или это кастомные модификации?

2. **Кастомные компоненты (components/):**
   - Правильно ли используются shadcn/ui примитивы
   - Нет ли дублирования Tailwind-классов, которые можно заменить на пропсы компонентов
   - Есть ли лишний кастомный CSS
   - Соблюдена ли структура data-slot атрибутов

3. **Feature-компоненты:**
   - Не содержат ли UI-логику, которая должна быть в примитивах
   - Не импортируют ли напрямую из `components/ui/` там, где можно через композицию
   - Нет ли избыточных обёрток

4. **Общие проблемы:**
   - Дублирование кода между `components/` и `features/` (например, nav-*, site-header)
   - Наличие дублирующейся папки `features/estimates copy/`
   - Accessibility: правильные aria-атрибуты, роли, фокус
   - Responsive: media queries, container queries
   - Импорты: правильные пути (алиас `@/`)
   - Неиспользуемые импорты

### Шаг 4. Формат отчёта

Сохрани отчёт в файл: `/home/openclaw/.openclaw/workspace/smetalabs/docs/ui-audit.md`

Формат:

```markdown
# UI Audit Report — SmetaLabs

Дата: YYYY-MM-DD

## Общая статистика

- Всего компонентов: N
- shadcn/ui примитивов: N
- Кастомных компонентов: N
- Feature-компонентов: N
- Проблемных: N

## 1. shadcn/ui примитивы

### button.tsx — ⚠️ / ✅ / ❌
- Расположение: `components/ui/button.tsx`
- Тип: shadcn/ui примитив (модифицирован / стандартный)
- Оценка:
  - `cn()`: ✅
  - `data-slot`: ✅
  - variants (cva): ✅ / ❌ (какие variants добавлены/удалены)
  - `asChild`/`Slot`: ✅
  - Кастомные изменения: (перечислить)
  - Замечания: (текст)
- Рекомендации: (текст)

... (остальные примитивы)

## 2. Кастомные компоненты

### app-sidebar.tsx — ⚠️ / ✅ / ❌
... (аналогичная структура)

## 3. Feature-компоненты

### features/dashboard/chart-area-interactive.tsx
... (аналогичная структура)

## 4. Архитектурные замечания

- Дублирование: `components/` vs `features/`
- `features/estimates copy/` — нужно удалить
- ...

## 5. Рекомендации (приоритет)

### P0 (критические)
...
### P1 (важные)
...
### P2 (косметические)
...
```

### Пример вывода

```markdown
### button.tsx — ⚠️
- Расположение: `components/ui/button.tsx`
- Тип: shadcn/ui примитив (кастомная модификация — добавлены варианты size: xs, icon, icon-xs, icon-sm, icon-lg)
- Оценка:
  - `cn()`: ✅
  - `data-slot`: ✅
  - variants (cva): ✅ (добавлены кастомные варианты размеров)
  - `asChild`/`Slot`: ✅ (через `Slot.Root`)
  - Кастомные изменения: добавлены size-варианты xs, icon, icon-xs, icon-sm, icon-lg; добавлены data-variant/data-size атрибуты
  - Замечания: размеры сильно деградированы от стандартных — это осознанное решение для плотного UI смет
- Рекомендации: ОК для текущей задачи, но при унификации стоит вынести кастомные варианты в тему
```

## Важно

- Если какой-то файл не удаётся прочитать — отметь это в отчёте
- Если находишь дублирующуюся папку `features/estimates copy/` — обязательно отметь
- Честно указывай проблемы, даже мелкие
- Итоговый отчёт должен быть самодостаточным и готовым к передаче разработчикам

---

Закончи, когда сохранишь отчёт.
