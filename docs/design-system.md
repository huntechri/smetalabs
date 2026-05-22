# SmetaLabs — Дизайн-система

> **Стек:** Next.js · shadcn/ui (radix-mira) · Tailwind v4 · oklch · Phosphor Icons
>
> **Главный принцип:** Максимально использовать то, что дают shadcn/ui и Tailwind из коробки. Никаких лишних абстракций, обёрток, кастомных решений.
>
> **Последняя проверка:** 2026-05-22 — актуально, 34 компонента в `components/ui/`, список полный. Интегрированы findings UI-аудита.

---

## 1. Каталог компонентов `components/ui/` (полный список)

Все 34 `.tsx` файла в `components/ui/`:

| Файл | Тип | Назначение |
|---|---|---|
| `aspect-ratio.tsx` | shadcn/Radix | Соотношение сторон |
| `avatar.tsx` | shadcn/Radix (расширен) | Аватар + группа + бейдж |
| `badge.tsx` | shadcn (расширен) | Бейдж (6 вариантов) |
| `breadcrumb.tsx` | shadcn | Хлебные крошки |
| `button-group.tsx` | кастомный | Группировка кнопок |
| `button.tsx` | shadcn (расширен) | Кнопка (расширенные размеры) |
| `calendar.tsx` | shadcn/react-day-picker | Календарь |
| `card.tsx` | shadcn (расширен) | Карточка |
| `chart.tsx` | shadcn/Recharts | Графики |
| `checkbox.tsx` | shadcn/Radix | Чекбокс |
| `collapsible.tsx` | shadcn/Radix | Раскрывающийся блок |
| `dialog.tsx` | shadcn/Radix (расширен) | Модальное окно |
| `drawer.tsx` | shadcn/Vaul | Мобильная панель снизу |
| `dropdown-menu.tsx` | shadcn/Radix (расширен) | Выпадающее меню |
| `editable-badge.tsx` | кастомный | Редактируемый бейдж |
| `empty.tsx` | кастомный | Пустое состояние |
| `field.tsx` | кастомный (Radix Mira) | Система полей формы |
| `frame.tsx` | кастомный | Декоративная рамка |
| `framed-button.tsx` | кастомный | Кнопка в рамке |
| `input.tsx` | shadcn (расширен) | Поле ввода |
| `label.tsx` | shadcn/Radix | Лейбл |
| `popover.tsx` | shadcn/Radix | Всплывающий контейнер |
| `select.tsx` | shadcn/Radix (расширен) | Выпадающий список |
| `separator.tsx` | shadcn/Radix | Разделитель |
| `sheet.tsx` | shadcn/Radix (расширен) | Боковая панель |
| `sidebar.tsx` | shadcn (расширен) | Сайдбар (большой компонент) |
| `skeleton.tsx` | shadcn | Скелетон (загрузка) |
| `sonner.tsx` | shadcn/sonner | Toast-уведомления |
| `table.tsx` | shadcn (расширен) | Таблица |
| `tabs.tsx` | shadcn/Radix (расширен) | Табы |
| `textarea.tsx` | shadcn (расширен) | Текстовая область |
| `toggle-group.tsx` | shadcn/Radix (расширен) | Группа toggle-кнопок |
| `toggle.tsx` | shadcn/Radix (расширен) | Toggle-кнопка |
| `tooltip.tsx` | shadcn/Radix | Тултип |

**Компоненты из shadcn skill, отсутствующие в коде:** `alert-dialog.tsx`, `alert.tsx`, `input-group.tsx` — не реализованы. `input-group` упоминается в `.agents/skills/shadcn/rules/forms.md` как рекомендуемый паттерн, но файл не добавлен.

---

## 2. Design Tokens

### 2.1 Цвета (CSS Variables + oklch)

Все цвета определены в `app/globals.css` через CSS-переменные. **Хардкодить oklch-значения в компонентах запрещено — только семантические переменные.**

| Токен | Светлая тема | Тёмная тема | Назначение |
|---|---|---|---|
| `--background` | `oklch(1 0 0)` | `oklch(0.147 0.004 49.25)` | Фон страницы |
| `--foreground` | `oklch(0.147 0.004 49.25)` | `oklch(0.985 0.001 106.423)` | Основной текст |
| `--card` | `oklch(1 0 0)` | `oklch(0.216 0.006 56.043)` | Фон карточек |
| `--card-foreground` | `oklch(0.147 …)` | `oklch(0.985 …)` | Текст на карточках |
| `--popover` | `oklch(1 0 0)` | `oklch(0.216 …)` | Фон popover/sheet/dropdown |
| `--popover-foreground` | `oklch(0.147 …)` | `oklch(0.985 …)` | Текст в popover |
| `--primary` | `oklch(0.496 0.265 301.924)` | `oklch(0.438 0.218 303.724)` | Акцент (фиолетовый) |
| `--primary-foreground` | `oklch(0.977 0.014 308.299)` | `oklch(0.977 …)` | Текст на primary |
| `--secondary` | `oklch(0.967 0.001 286.375)` | `oklch(0.274 0.006 286.033)` | Вторичный фон |
| `--secondary-foreground` | `oklch(0.21 …)` | `oklch(0.985 …)` | Вторичный текст |
| `--muted` | `oklch(0.97 0.001 106.424)` | `oklch(0.268 0.007 34.298)` | Приглушённый фон |
| `--muted-foreground` | `oklch(0.553 0.013 58.071)` | `oklch(0.709 0.01 56.259)` | Приглушённый текст |
| `--accent` | `oklch(0.97 …)` | `oklch(0.268 …)` | Акцентный фон (hover) |
| `--accent-foreground` | `oklch(0.216 …)` | `oklch(0.985 …)` | Акцентный текст |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` | Удаление/ошибка (красный) |
| `--border` | `oklch(0.923 0.003 48.717)` | `oklch(1 0 0 / 10%)` | Границы |
| `--input` | `oklch(0.923 0.003 48.717)` | `oklch(1 0 0 / 15%)` | Поля ввода |
| `--ring` | `oklch(0.709 0.01 56.259)` | `oklch(0.553 0.013 58.071)` | Кольцо фокуса |
| `--chart-1…5` | Зелёная палитра (5 оттенков) | Та же | Графики |
| `--sidebar-*` | Производные от primary/muted | Тёмные производные | Компоненты Sidebar |
| `--radius` | `0.625rem` | То же | Базовый радиус |

**Блок `@theme inline`** пробрасывает все переменные как Tailwind-токены (`--color-background`, `--color-primary` и т.д.).

```tsx
// ✅ Правильно — семантические utility-классы
<div className="bg-background text-foreground">
<div className="text-muted-foreground">
<div className="border-border">

// ❌ Запрещено — хардкод
<div className="bg-[oklch(0.147_0.004_49.25)]">
<div style={{ color: '#7c3aed' }}>
```

### 2.2 Радиусы

Базовый радиус: `--radius: 0.625rem` (10px).

| Токен | Значение | Tailwind-класс |
|---|---|---|
| `--radius-sm` | `0.6 × 0.625 ≈ 0.375rem` | `rounded-sm` |
| `--radius-md` | `0.8 × 0.625 ≈ 0.5rem` | `rounded-md` |
| `--radius-lg` | `0.625rem` | `rounded-lg` |
| `--radius-xl` | `1.4 × 0.625 ≈ 0.875rem` | `rounded-xl` |
| `--radius-2xl` | `1.8 × 0.625 ≈ 1.125rem` | `rounded-2xl` |
| `--radius-3xl` | `2.2 × 0.625 ≈ 1.375rem` | `rounded-3xl` |
| `--radius-4xl` | `2.6 × 0.625 ≈ 1.625rem` | `rounded-4xl` |

### 2.3 Тени

Тени стандартные Tailwind (`shadow-sm`, `shadow-md`, `shadow-lg`). Не кастомизированы.

### 2.4 Кастомные утилиты

Единственный кастомный CSS в проекте — `scrollbar-subtle` (тонкий скроллбар через `scrollbar-width: thin` + `::-webkit-scrollbar`).

---

## 3. Типографика

### 3.1 Шрифты

| Назначение | Семейство | CSS-переменная | Tailwind-класс |
|---|---|---|---|
| Основной текст | **Nunito Sans** | `--font-sans` | `font-sans` |
| Заголовки | **Roboto Slab** | `--font-heading` | `font-heading` |
| Моноширинный | **Geist Mono** | `--font-mono` | `font-mono` |

`font-sans` применён глобально на `<html>`. Заголовки (`CardTitle`, `DialogTitle`, `EmptyTitle`) используют `font-heading`.

### 3.2 Размеры

| Размер | Tailwind | Где используется |
|---|---|---|
| `10px` | `text-[0.625rem]` | Badge, shortcut-клавиши |
| `12px` | `text-xs` | Основной текст в проекте (с `text-xs/relaxed`) |
| `14px` | `text-sm` | Заголовки (CardTitle, DialogTitle), Input |
| `16px` | `text-base` | Почти не используется |

### 3.3 Начертания

| Класс | Применение |
|---|---|
| `font-normal` | Описания, хлебные крошки |
| `font-medium` | Заголовки, кнопки, label, badge, toggle |
| `font-heading` | CardTitle, DialogTitle, EmptyTitle |

---

## 4. Spacing

Стандартная шкала Tailwind v4 (1 unit = 4px). **Не кастомизирована.**

| Класс | px | Где используется |
|---|---|---|
| `gap-1` | 4px | CardHeader, DialogHeader/Footer, TabsTrigger |
| `gap-1.5` | 6px | BreadcrumbList |
| `gap-2` | 8px | Layout, Sidebar |
| `p-2` | 8px | TableCell, Input, SidebarGroup, SelectItem |
| `px-2` | 8px | Button, Badge, Input, SelectTrigger |
| `gap-4` | 16px | Card, DialogContent, FieldGroup |
| `px-4` | 16px | CardContent, CardHeader, CardFooter |
| `p-4` | 16px | DialogContent |
| `p-6` | 24px | Empty |

---

## 5. Компоненты (каталог + примеры)

### 5.1 Avatar

**Импорт:** `@/components/ui/avatar`
**Экспорт:** `Avatar`, `AvatarImage`, `AvatarFallback`, `AvatarGroup`, `AvatarGroupCount`, `AvatarBadge`

```tsx
<Avatar size="sm">  {/* default | sm | lg */}
  <AvatarImage src="/user.jpg" alt="User" />
  <AvatarFallback>JD</AvatarFallback>
  <AvatarBadge>●</AvatarBadge>
</Avatar>

<AvatarGroup>
  <Avatar size="sm"><AvatarFallback>A</AvatarFallback></Avatar>
  <Avatar size="sm"><AvatarFallback>B</AvatarFallback></Avatar>
  <AvatarGroupCount>+5</AvatarGroupCount>
</AvatarGroup>
```

### 5.2 Badge

**Импорт:** `@/components/ui/badge`
**Экспорт:** `Badge`, `badgeVariants`
**Варианты:** `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`

```tsx
<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>
```

### 5.3 Breadcrumb

**Импорт:** `@/components/ui/breadcrumb`
**Экспорт:** `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`, `BreadcrumbEllipsis`

```tsx
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Current</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

### 5.4 Button

**Импорт:** `@/components/ui/button`
**Экспорт:** `Button`, `buttonVariants`
**Варианты:** `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`
**Размеры:** `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`

```tsx
<Button variant="destructive" size="sm">Delete</Button>
<Button size="icon"><GearIcon /></Button>

{/* Кнопка-ссылка */}
<Button asChild><Link href="/dashboard">Dashboard</Link></Button>
```

### 5.5 ButtonGroup

**Импорт:** `@/components/ui/button-group`
**Экспорт:** `ButtonGroup`, `ButtonGroupText`, `ButtonGroupSeparator`

Группировка кнопок. Используется через композицию с `Button`.

```tsx
<ButtonGroup>
  <Button variant="outline" size="sm">А</Button>
  <Button variant="outline" size="sm">Б</Button>
</ButtonGroup>
```

### 5.6 Card

**Импорт:** `@/components/ui/card`
**Экспорт:** `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`
**Размеры `Card`:** `default`, `sm`

```tsx
<Card size="sm">
  <CardHeader>
    <CardTitle>Quick Stats</CardTitle>
    <CardDescription>Updated 2h ago</CardDescription>
    <CardAction>
      <Button variant="ghost" size="icon-sm"><DotsThreeIcon /></Button>
    </CardAction>
  </CardHeader>
  <CardContent>42 active users</CardContent>
  <CardFooter className="border-t">
    <Button variant="outline">Cancel</Button>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

### 5.7 Chart

**Импорт:** `@/components/ui/chart`

Обёртка для Recharts с `ChartContainer`, `ChartTooltip`, `ChartLegend`, `ChartStyle`. Использует цветовые токены `--chart-1…5`.

### 5.8 Checkbox

**Импорт:** `@/components/ui/checkbox`

```tsx
<Field orientation="horizontal">
  <Checkbox id="agree" checked={checked} onCheckedChange={setChecked} />
  <FieldLabel htmlFor="agree">I agree</FieldLabel>
</Field>
```

### 5.9 Collapsible

**Импорт:** `@/components/ui/collapsible`
**Экспорт:** `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`

### 5.10 Dialog

**Импорт:** `@/components/ui/dialog`
**Экспорт:** `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`
**Пропсы `DialogContent`:** `showCloseButton` (default: `true`)

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button variant="destructive">Delete</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete project?</DialogTitle>
      <DialogDescription>This action cannot be undone.</DialogDescription>
    </DialogHeader>
    <DialogFooter showCloseButton>
      <Button variant="destructive">Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 5.11 Drawer

**Импорт:** `@/components/ui/drawer`

Альтернатива Dialog для мобильных — на базе Vaul, выезжает снизу.

### 5.12 DropdownMenu

**Импорт:** `@/components/ui/dropdown-menu`

Полная реализация: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuGroup`, `DropdownMenuLabel`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`.

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon-sm"><DotsThreeIcon /></Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>Actions</DropdownMenuLabel>
    <DropdownMenuItem>Edit</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### 5.13 EditableBadge

**Импорт:** `@/components/ui/editable-badge`

Бейдж с inline-редактированием. Используется в строках закупок и выполнения.

```tsx
<EditableBadge
  label="Кол-во"
  value={qty}
  onChange={setQty}
  formatDisplay={formatNumber}
  strong
/>
```

### 5.14 Empty

**Импорт:** `@/components/ui/empty`
**Экспорт:** `Empty`, `EmptyHeader`, `EmptyTitle`, `EmptyDescription`, `EmptyContent`, `EmptyMedia`

**Пропсы `EmptyMedia`:** `variant` — `default` | `icon`

```tsx
<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon"><FolderIcon /></EmptyMedia>
    <EmptyTitle>No projects yet</EmptyTitle>
    <EmptyDescription>Create your first project to get started.</EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <Button>Create Project</Button>
  </EmptyContent>
</Empty>
```

### 5.15 Field

**Импорт:** `@/components/ui/field`
**Экспорт:** `Field`, `FieldLabel`, `FieldTitle`, `FieldDescription`, `FieldError`, `FieldContent`, `FieldGroup`, `FieldLegend`, `FieldSeparator`, `FieldSet`

**Пропсы `Field`:** `orientation` — `vertical` | `horizontal` | `responsive`
**Пропсы `FieldError`:** `errors` — массив ошибок

```tsx
<FieldSet>
  <FieldLegend>Profile</FieldLegend>
  <FieldGroup>
    <Field orientation="responsive">
      <FieldLabel htmlFor="name">
        <FieldTitle>Name</FieldTitle>
        <FieldDescription>Your full name</FieldDescription>
      </FieldLabel>
      <FieldContent>
        <Input id="name" placeholder="John Doe" />
        <FieldError errors={[{ message: "Required" }]} />
      </FieldContent>
    </Field>
    <FieldSeparator>Optional</FieldSeparator>
    <Field orientation="horizontal">
      <Checkbox id="notify" />
      <FieldLabel htmlFor="notify">
        <FieldTitle>Notifications</FieldTitle>
      </FieldLabel>
    </Field>
  </FieldGroup>
</FieldSet>
```

### 5.16 Frame / FramedButton

**Импорт:** `@/components/ui/frame`, `@/components/ui/framed-button`

`Frame` — декоративный контейнер (`inline-flex rounded-md border border-dashed p-1`).
`FramedButton` — `Button` внутри `Frame`.

### 5.17 Input

**Импорт:** `@/components/ui/input`

```tsx
<Input placeholder="Search..." />

{/* С иконкой (композиция, не обёртка) */}
<div className="relative">
  <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
  <Input className="pl-7" placeholder="Search..." />
</div>
```

### 5.18 Label

**Импорт:** `@/components/ui/label`

Обычно используется внутри `FieldLabel`. Редко нужен напрямую.

### 5.19 Popover

**Импорт:** `@/components/ui/popover`

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" size="sm"><CalendarDots /></Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0" align="start">
    <Calendar mode="single" selected={date} onSelect={setDate} />
  </PopoverContent>
</Popover>
```

### 5.20 Select

**Импорт:** `@/components/ui/select`
**Размеры `SelectTrigger`:** `sm` | `default`

```tsx
<Select>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Options</SelectLabel>
      <SelectItem value="a">A</SelectItem>
      <SelectItem value="b">B</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>
```

### 5.21 Separator

**Импорт:** `@/components/ui/separator`

```tsx
<Separator />
<Separator orientation="vertical" className="h-4" />
```

### 5.22 Sheet

**Импорт:** `@/components/ui/sheet`

Боковая панель (slide-over), используется в Sidebar для мобильной версии.

### 5.23 Sidebar

**Импорт:** `@/components/ui/sidebar`

Самый сложный компонент: `SidebarProvider` (Cookie-based persistence), `Sidebar`, `SidebarTrigger`, `SidebarContent`, `SidebarHeader`, `SidebarFooter`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupAction`, `SidebarGroupContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarMenuAction`, `SidebarMenuBadge`, `SidebarMenuSub`, `SidebarMenuSubItem`, `SidebarMenuSubButton`, `SidebarInput`, `SidebarSeparator`, `SidebarInset`, `SidebarRail`, `useSidebar`.

**Пропсы `Sidebar`:** `side` (`left`|`right`), `variant` (`sidebar`|`floating`|`inset`), `collapsible` (`offcanvas`|`icon`|`none`)

### 5.24 Skeleton

**Импорт:** `@/components/ui/skeleton`

```tsx
<div className="flex items-center gap-2">
  <Skeleton className="size-8 rounded-full" />
  <div className="flex flex-col gap-1">
    <Skeleton className="h-4 w-32" />
    <Skeleton className="h-3 w-24" />
  </div>
</div>
```

### 5.25 Sonner

**Импорт:** `@/components/ui/sonner`

Используй `toast()` из `sonner` напрямую.

### 5.26 Table

**Импорт:** `@/components/ui/table`

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map(item => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
        <TableCell><Badge variant="outline">{item.status}</Badge></TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### 5.27 Tabs

**Импорт:** `@/components/ui/tabs`
**Пропсы `Tabs`:** `orientation` — `horizontal` | `vertical`
**Пропсы `TabsList`:** `variant` — `default` | `line`

```tsx
<Tabs defaultValue="tab1">
  <TabsList variant="line">
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

### 5.28 Textarea

**Импорт:** `@/components/ui/textarea`

`field-sizing-content` (autosize), минимальный размер `h-7`.

### 5.29 Toggle / ToggleGroup

**Импорт:** `@/components/ui/toggle`, `@/components/ui/toggle-group`
**Варианты Toggle:** `default` | `outline`
**Размеры Toggle:** `default` | `sm` | `lg`

### 5.30 Tooltip

**Импорт:** `@/components/ui/tooltip`

`TooltipProvider` уже на корневом `layout.tsx` — не добавляй повторно.

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon-sm"><InfoIcon /></Button>
  </TooltipTrigger>
  <TooltipContent>
    Save <span data-slot="kbd">⌘S</span>
  </TooltipContent>
</Tooltip>
```

### 5.31 Calendar

**Импорт:** `@/components/ui/calendar`

На базе `react-day-picker` v9. Используется внутри `Popover`.

### 5.32 AspectRatio

**Импорт:** `@/components/ui/aspect-ratio`

Сохранение пропорций изображений/видео.

---

## 6. Layout Patterns

### 6.1 Sidebar + Main (основной layout)

```tsx
<SidebarProvider defaultOpen={true}>
  <Sidebar collapsible="icon">
    <SidebarHeader>{/* Logo */}</SidebarHeader>
    <SidebarContent>{/* Nav */}</SidebarContent>
    <SidebarFooter>{/* User */}</SidebarFooter>
  </Sidebar>
  <SidebarInset>
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4" />
      <Breadcrumb>{/* ... */}</Breadcrumb>
    </header>
    <main className="flex-1 overflow-auto p-4 scrollbar-subtle">{children}</main>
  </SidebarInset>
</SidebarProvider>
```

### 6.2 Page Header + Content

```tsx
<div className="flex flex-col gap-4">
  <div className="flex items-center justify-between">
    <div>
      <h1 className="font-heading text-sm font-medium">Projects</h1>
      <p className="text-xs text-muted-foreground">Manage your projects</p>
    </div>
    <Button>New Project</Button>
  </div>
  {/* Content */}
</div>
```

### 6.3 Card Grid

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {items.map(item => <Card key={item.id}>{/* ... */}</Card>)}
</div>
```

### 6.4 Form Layout

```tsx
<div className="flex flex-col gap-6 lg:flex-row">
  <nav className="w-full shrink-0 lg:w-48">{/* Tabs vertical */}</nav>
  <div className="flex-1">
    <FieldSet><FieldGroup>{/* Fields */}</FieldGroup></FieldSet>
  </div>
</div>
```

### 6.5 Split Panels (master-detail)

```tsx
<div className="flex h-full gap-0">
  <div className="w-80 border-r p-4 overflow-auto scrollbar-subtle">{/* List */}</div>
  <div className="flex-1 overflow-auto p-4 scrollbar-subtle">{/* Detail */}</div>
</div>
```

### 6.6 Centered (auth, empty)

```tsx
<div className="flex min-h-svh items-center justify-center">
  <Card className="w-full max-w-sm">{/* Login */}</Card>
</div>
```

### 6.7 Toolbar

```tsx
<div className="flex items-center gap-2">
  <Input placeholder="Filter..." className="w-48" />
  <div className="flex-1" />
  <Button variant="outline" size="sm">Export</Button>
  <Button size="sm">Create</Button>
</div>
```

### 6.8 Sticky Header

```tsx
<div className="sticky top-0 z-10 bg-background border-b">
  <div className="flex h-12 items-center gap-2 px-4">{/* Header */}</div>
</div>
```

---

## 7. Conventions (Правила)

### 7.1 Цвета — только через CSS-переменные

```tsx
// ✅ Правильно
<div className="bg-primary text-primary-foreground">
<div className="text-muted-foreground">
<Button variant="destructive">

// ❌ Запрещено
<div className="bg-[oklch(0.496_0.265_301.924)]">
<div style={{ color: '#7c3aed' }}>
```

### 7.2 Никакого кастомного CSS

```tsx
// ✅ Tailwind utility-классы
<div className="flex items-center gap-2 p-4 rounded-lg border">

// ❌ Кастомные классы (кроме scrollbar-subtle)
<div className="my-wrapper">
<style>{`.my-wrapper { display: flex; }`}</style>
```

### 7.3 Никаких обёрток над shadcn/ui

```tsx
// ✅ Импорт напрямую
import { Button } from "@/components/ui/button"
<Button variant="destructive" size="sm">Delete</Button>

// ❌ Кастомная обёртка
import { DestructiveButton } from "@/components/destructive-button"
```

### 7.4 Композиция через children

```tsx
// ✅ Композиция
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardAction>
      <Button variant="ghost" size="icon-sm"><DotsThreeIcon /></Button>
    </CardAction>
  </CardHeader>
</Card>

// ❌ Правка исходников components/ui/
```

### 7.5 Иконки — только Phosphor

```tsx
// ✅
import { HouseIcon, GearIcon } from "@phosphor-icons/react"

// ❌ Запрещено
import { HomeIcon } from "@heroicons/react"
import { FiHome } from "react-icons/fi"
import { IconTrendingUp } from "@tabler/icons-react"
```

### 7.6 Утилита `cn()` — всегда

```tsx
import { cn } from "@/lib/utils"
<div className={cn("base-class", condition && "conditional", className)} />
```

### 7.7 Адаптивность

| Breakpoint | Min width |
|---|---|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |

Mobile-first: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.

### 7.8 Состояния — data-атрибуты

shadcn/ui использует `data-*` для стилизации состояний:

```tsx
data-active:bg-sidebar-accent
aria-expanded:bg-muted
group-data-[collapsible=icon]:w-(--sidebar-width-icon)
```

---

## 8. Ссылки

- **shadcn/ui:** https://ui.shadcn.com/docs
- **Tailwind CSS v4:** https://tailwindcss.com/docs
- **Radix UI Primitives:** https://www.radix-ui.com/primitives
- **Phosphor Icons:** https://phosphoricons.com
- **oklch:** https://oklch.com

---

## Приложение А: Findings UI-аудита (2026-05-07)

### P0 — критические

1. **Дублирование `components/` ↔ `features/`** — `app-sidebar`, `site-header`, `nav-main`, `nav-secondary`, `nav-user`, `nav-documents` дублируются. Features-версии актуальнее. Удалить `components/`-версии.

2. **`@tabler/icons-react` cross-contamination** — `features/dashboard/section-cards-dashboard.tsx` использует Tabler-иконки. Проект использует Phosphor. Заменить и удалить пакет.

3. **`features/estimates copy/`** — полная дублирующаяся копия. Удалить.

4. **Отладочные стили в production** — `border-dashed border-pink-500` в `estimate-navigation-tabs.tsx`, `border-dashed` в `projects-view.tsx`. Удалить.

### P1 — важные

5. **Захардкоженные данные** — "Acme Inc." в components/app-sidebar, "Documents" в site-header.

6. **Смесь языков** — русский (create-section-dialog) и английский (login-form). Определиться.

7. **Неиспользуемые компоненты** — `features/nav-secondary.tsx` закомментирован.

### Статус на 2026-05-22

Актуальный статус исправлений не проверялся. Рекомендуется повторный аудит.

---

> **Кратко:** Используй shadcn/ui напрямую, Tailwind utility-классы, CSS-переменные для цветов и Phosphor для иконок. В 95% случаев этого достаточно без единой строчки кастомного CSS.
