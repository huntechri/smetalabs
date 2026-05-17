# SmetaLabs — Дизайн-система

> **Стек:** Next.js · shadcn/ui (radix-mira) · Tailwind v4 · oklch · Phosphor Icons
>
> **Главный принцип:** Максимально использовать то, что дают shadcn/ui и Tailwind из коробки. Никаких лишних абстракций, обёрток, кастомных решений.
>
> **Последняя проверка:** 2026-05-17 — актуально. Все 36 компонентов `components/ui/` задокументированы. Добавлен Spinner. Добавлены фичи: account-settings (6 карточек), workspace-settings (16+ компонентов, включая 12 в members/ и 7 хуков), access-control, directory toolbars. Добавлен auth-illustration.

---

## 1. Design Tokens

### 1.1 Цвета (CSS Variables + oklch)

Все цвета определены в `app/globals.css` через CSS-переменные и автоматически проброшены в Tailwind через блок `@theme inline`. **Никогда не хардкодить oklch-значения в компонентах — всегда использовать семантические переменные.**

| Токен                    | Светлая тема                              | Тёмная тема                    | Назначение                   |
| ------------------------ | ----------------------------------------- | ------------------------------ | ---------------------------- |
| `--background`           | `oklch(1 0 0)` — белый                    | `oklch(0.147 …)` — тёмный      | Фон страницы                 |
| `--foreground`           | `oklch(0.147 …)` — почти чёрный           | `oklch(0.985 …)` — почти белый | Основной текст               |
| `--card`                 | `oklch(1 0 0)`                            | `oklch(0.216 …)`               | Фон карточек                 |
| `--card-foreground`      | `oklch(0.147 …)`                          | `oklch(0.985 …)`               | Текст на карточках           |
| `--popover`              | `oklch(1 0 0)`                            | `oklch(0.216 …)`               | Фон popover/sheet/dropdown   |
| `--popover-foreground`   | `oklch(0.147 …)`                          | `oklch(0.985 …)`               | Текст в popover              |
| `--primary`              | `oklch(0.496 0.265 301.924)` — фиолетовый | `oklch(0.438 0.218 303.724)`   | Акцентный цвет               |
| `--primary-foreground`   | `oklch(0.977 …)` — почти белый            | `oklch(0.977 …)`               | Текст на primary             |
| `--secondary`            | `oklch(0.967 …)` — светло-серый           | `oklch(0.274 …)`               | Вторичный фон                |
| `--secondary-foreground` | `oklch(0.21 …)`                           | `oklch(0.985 …)`               | Вторичный текст              |
| `--muted`                | `oklch(0.97 …)`                           | `oklch(0.268 …)`               | Приглушённый фон             |
| `--muted-foreground`     | `oklch(0.553 …)`                          | `oklch(0.709 …)`               | Приглушённый текст           |
| `--accent`               | `oklch(0.97 …)`                           | `oklch(0.268 …)`               | Акцентный фон (hover и т.д.) |
| `--accent-foreground`    | `oklch(0.216 …)`                          | `oklch(0.985 …)`               | Акцентный текст              |
| `--destructive`          | `oklch(0.577 0.245 27.325)` — красный     | `oklch(0.704 …)`               | Удаление / ошибка            |
| `--border`               | `oklch(0.923 …)`                          | `oklch(1 0 0 / 10%)`           | Границы                      |
| `--input`                | `oklch(0.923 …)`                          | `oklch(1 0 0 / 15%)`           | Поля ввода                   |
| `--ring`                 | `oklch(0.709 …)`                          | `oklch(0.553 …)`               | Кольцо фокуса                |
| `--chart-1…5`            | Зелёная палитра                           | Та же                          | Графики                      |
| `--sidebar*`             | Производные от primary/muted              | Тёмные производные             | Компоненты Sidebar           |

**Использование в Tailwind:**

```tsx
// ✅ Правильно — через семантические utility-классы
<div className="bg-background text-foreground">
<div className="text-muted-foreground">
<div className="border-border">
<div className="bg-primary text-primary-foreground">

// ❌ Неправильно — хардкод oklch
<div className="bg-[oklch(0.147_0.004_49.25)]">
<div style={{ color: 'oklch(0.496 0.265 301.924)' }}>
```

### 1.2 Радиусы

Базовый радиус: `--radius: 0.625rem` (10px). Производные вычисляются автоматически:

| Токен          | Значение                  | Tailwind-класс |
| -------------- | ------------------------- | -------------- |
| `--radius-sm`  | `0.6 × radius ≈ 0.375rem` | `rounded-sm`   |
| `--radius-md`  | `0.8 × radius ≈ 0.5rem`   | `rounded-md`   |
| `--radius-lg`  | `radius = 0.625rem`       | `rounded-lg`   |
| `--radius-xl`  | `1.4 × radius ≈ 0.875rem` | `rounded-xl`   |
| `--radius-2xl` | `1.8 × radius ≈ 1.125rem` | `rounded-2xl`  |
| `--radius-3xl` | `2.2 × radius ≈ 1.375rem` | `rounded-3xl`  |
| `--radius-4xl` | `2.6 × radius ≈ 1.625rem` | `rounded-4xl`  |

### 1.3 Тени

Тени не кастомизированы — используются стандартные Tailwind-классы (`shadow-sm`, `shadow-md`, `shadow-lg`). В компонентах shadcn/ui тени применяются ситуативно (popover, dropdown, floating sidebar).

---

## 2. Типографика

### 2.1 Шрифты

| Назначение     | Семейство       | CSS-переменная   | Tailwind-класс |
| -------------- | --------------- | ---------------- | -------------- |
| Основной текст | **Nunito Sans** | `--font-sans`    | `font-sans`    |
| Заголовки      | **Roboto Slab** | `--font-heading` | `font-heading` |
| Моноширинный   | **Geist Mono**  | `--font-mono`    | `font-mono`    |

`font-sans` применён глобально на `<html>` — весь текст по умолчанию использует Nunito Sans. Заголовки (`CardTitle`, `DialogTitle`, `EmptyTitle`) используют `font-heading` внутри компонентов shadcn.

### 2.2 Размеры (из Tailwind, без кастомизации)

| Размер            | Tailwind-класс    | Где используется                          |
| ----------------- | ----------------- | ----------------------------------------- |
| `0.625rem` (10px) | `text-[0.625rem]` | Badge, маленькие label, shortcut-клавиши  |
| `0.75rem` (12px)  | `text-xs`         | Основной размер текста в проекте          |
| `0.875rem` (14px) | `text-sm`         | Заголовки (CardTitle, DialogTitle), Input |
| `1rem` (16px)     | `text-base`       | Не используется (проект компактный)       |
| `1.125rem` (18px) | `text-lg`         | Не используется                           |

**`text-xs/relaxed`** — стандартный класс для основного текста в проекте (12px, увеличенный line-height).

### 2.3 Начертания

| Класс          | Применение                                       |
| -------------- | ------------------------------------------------ |
| `font-normal`  | BreadcrumbPage, FieldDescription                 |
| `font-medium`  | Заголовки, кнопки, label, badge, toggle          |
| `font-heading` | CardTitle, DialogTitle, EmptyTitle (Roboto Slab) |

---

## 3. Spacing (Tailwind Scale)

Spacing **не кастомизирован**. Используется стандартная шкала Tailwind v4 (1 unit = 0.25rem = 4px):

| Класс     | px   | Где используется                             |
| --------- | ---- | -------------------------------------------- |
| `gap-1`   | 4px  | CardHeader, DialogHeader/Footer, TabsTrigger |
| `gap-1.5` | 6px  | BreadcrumbList                               |
| `gap-2`   | 8px  | Layout (Tabs), Sidebar elements              |
| `p-2`     | 8px  | TableCell, Input, SidebarGroup, SelectItem   |
| `px-2`    | 8px  | Button, Badge, Input, SelectTrigger          |
| `gap-4`   | 16px | Card, DialogContent, FieldGroup              |
| `px-4`    | 16px | CardContent, CardHeader, CardFooter          |
| `p-4`     | 16px | DialogContent                                |
| `p-6`     | 24px | Empty                                        |

**Без кастомизации.** Если нужно расстояние — используй стандартные классы Tailwind: `p-2`, `gap-4`, `m-6` и т.д.

---

## 4. Компоненты (Каталог shadcn/ui)

> **Все компоненты лежат в `@/components/ui/` и импортируются напрямую. Никаких обёрток.**

### 4.1 Avatar

**Импорт:** `@/components/ui/avatar`
**Экспорт:** `Avatar`, `AvatarImage`, `AvatarFallback`, `AvatarGroup`, `AvatarGroupCount`, `AvatarBadge`

**Пропсы:**

- `size` — `"default"` | `"sm"` | `"lg"` (default: `"default"`)

```tsx
// ✅ Базовое использование
<Avatar size="sm">
  <AvatarImage src="/user.jpg" alt="User" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>

// ✅ Группа аватаров
<AvatarGroup>
  <Avatar size="sm"><AvatarFallback>A</AvatarFallback></Avatar>
  <Avatar size="sm"><AvatarFallback>B</AvatarFallback></Avatar>
  <AvatarGroupCount>+5</AvatarGroupCount>
</AvatarGroup>

// ✅ С бейджем
<Avatar size="lg">
  <AvatarFallback>JD</AvatarFallback>
  <AvatarBadge>●</AvatarBadge>
</Avatar>
```

### 4.2 Badge

**Импорт:** `@/components/ui/badge`
**Экспорт:** `Badge`, `badgeVariants`

**Пропсы:**

- `variant` — `"default"` | `"secondary"` | `"destructive"` | `"outline"` | `"ghost"` | `"link"`
- `asChild` — обернуть дочерний элемент (для ссылок)

```tsx
// ✅ Вариации
<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>

// ❌ Не создавай обёртки
<CustomBadge variant="success">Success</CustomBadge> // ← нет такого варианта!
```

### 4.3 Breadcrumb

**Импорт:** `@/components/ui/breadcrumb`
**Экспорт:** `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`, `BreadcrumbEllipsis`

```tsx
// ✅ Стандартное использование
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Current</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

### 4.4 Button

**Импорт:** `@/components/ui/button`
**Экспорт:** `Button`, `buttonVariants`

**Пропсы:**

- `variant` — `"default"` | `"outline"` | `"secondary"` | `"ghost"` | `"destructive"` | `"link"`
- `size` — `"default"` | `"xs"` | `"sm"` | `"lg"` | `"icon"` | `"icon-xs"` | `"icon-sm"` | `"icon-lg"`
- `asChild` — использовать как обёртку для `<a>` или `<Link>`

```tsx
// ✅ Вариации
<Button>Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="destructive">Delete</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><GearIcon /></Button>

// ✅ Кнопка-ссылка (Next.js Link)
import Link from "next/link"
<Button asChild><Link href="/dashboard">Dashboard</Link></Button>

// ❌ Не добавляй кастомные пропсы поверх
<Button colorScheme="purple">Custom Color</Button> // ← нет такого!
// Вместо этого используй className с CSS-переменными:
<Button className="bg-chart-2 text-white">Green</Button>
```

### 4.5 ButtonGroup

**Импорт:** `@/components/ui/button-group`

Группировка кнопок. Используется через композицию Button.

### 4.6 Card

**Импорт:** `@/components/ui/card`
**Экспорт:** `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`

**Пропсы:**

- `size` — `"default"` | `"sm"` (только у `Card`)

```tsx
// ✅ Полная карточка
<Card>
  <CardHeader>
    <CardTitle>Project Overview</CardTitle>
    <CardDescription>Updated 2 hours ago</CardDescription>
    <CardAction>
      <Button variant="ghost" size="icon-sm"><DotsThreeIcon /></Button>
    </CardAction>
  </CardHeader>
  <CardContent>
    <p>Content here...</p>
  </CardContent>
  <CardFooter className="border-t">
    <Button variant="outline">Cancel</Button>
    <Button>Save</Button>
  </CardFooter>
</Card>

// ✅ Компактная карточка
<Card size="sm">
  <CardHeader>
    <CardTitle>Quick Stats</CardTitle>
  </CardHeader>
  <CardContent>42 active users</CardContent>
</Card>
```

### 4.7 Chart

**Импорт:** `@/components/ui/chart`

Обёртка для Recharts с поддержкой цветовых токенов `--chart-1…5`.

### 4.8 Checkbox

**Импорт:** `@/components/ui/checkbox`

```tsx
// ✅ Внутри Field (рекомендуется)
<Field orientation="horizontal">
  <Checkbox id="agree" />
  <FieldLabel htmlFor="agree">I agree to terms</FieldLabel>
</Field>

// ✅ Контролируемый
<Checkbox checked={checked} onCheckedChange={setChecked} />
```

### 4.9 Collapsible

**Импорт:** `@/components/ui/collapsible`
**Экспорт:** `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`

```tsx
<Collapsible>
  <CollapsibleTrigger asChild>
    <Button variant="ghost">Toggle</Button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    <p>Hidden content...</p>
  </CollapsibleContent>
</Collapsible>
```

### 4.10 Dialog

**Импорт:** `@/components/ui/dialog`
**Экспорт:** `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`

**Пропсы:**

- `showCloseButton` — `boolean` (default: `true` у `DialogContent`, `false` у `DialogFooter`)

```tsx
// ✅ Подтверждение действия
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

// ❌ Не создавай обёртку ConfirmDialog
```

### 4.11 Drawer

**Импорт:** `@/components/ui/drawer`

Альтернатива Dialog для мобильных — выезжает снизу.

### 4.12 DropdownMenu

**Импорт:** `@/components/ui/dropdown-menu`
**Экспорт:** `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuGroup`, `DropdownMenuLabel`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`

**Пропсы:**

- `inset` — отступ слева (у `DropdownMenuItem`, `DropdownMenuLabel`, etc.)
- `variant` — `"default"` | `"destructive"` (у `DropdownMenuItem`)

```tsx
// ✅ Контекстное меню
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon-sm">
      <DotsThreeIcon />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>Actions</DropdownMenuLabel>
    <DropdownMenuItem>Edit</DropdownMenuItem>
    <DropdownMenuItem>Duplicate</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### 4.13 Empty (Empty State)

**Импорт:** `@/components/ui/empty`
**Экспорт:** `Empty`, `EmptyHeader`, `EmptyTitle`, `EmptyDescription`, `EmptyContent`, `EmptyMedia`

**Пропсы:**

- `variant` — `"default"` | `"icon"` (у `EmptyMedia`)

```tsx
// ✅ Пустое состояние
<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon">
      <FolderIcon />
    </EmptyMedia>
    <EmptyTitle>No projects yet</EmptyTitle>
    <EmptyDescription>
      Create your first project to get started.
    </EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <Button>Create Project</Button>
  </EmptyContent>
</Empty>
```

### 4.14 Field (Form Field)

**Импорт:** `@/components/ui/field`
**Экспорт:** `Field`, `FieldLabel`, `FieldTitle`, `FieldDescription`, `FieldError`, `FieldContent`, `FieldGroup`, `FieldLegend`, `FieldSeparator`, `FieldSet`

**Пропсы:**

- `orientation` — `"vertical"` | `"horizontal"` | `"responsive"` (у `Field`)
- `errors` — массив ошибок (у `FieldError`)

```tsx
// ✅ Форма с полями
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
        <FieldError errors={[{ message: "Name is required" }]} />
      </FieldContent>
    </Field>

    <FieldSeparator>Optional</FieldSeparator>

    <Field orientation="horizontal">
      <Checkbox id="notify" />
      <FieldLabel htmlFor="notify">
        <FieldTitle>Notifications</FieldTitle>
        <FieldDescription>Receive email updates</FieldDescription>
      </FieldLabel>
    </Field>
  </FieldGroup>
</FieldSet>
```

### 4.15 Input

**Импорт:** `@/components/ui/input`

```tsx
// ✅ Обычное поле
<Input placeholder="Search..." />

// ✅ С иконкой (композиция, не обёртка)
<div className="relative">
  <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
  <Input className="pl-7" placeholder="Search..." />
</div>
```

### 4.16 Label

**Импорт:** `@/components/ui/label`

Используется внутри `FieldLabel` — редко нужен напрямую.

### 4.17 Select

**Импорт:** `@/components/ui/select`
**Экспорт:** `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectGroup`, `SelectLabel`, `SelectItem`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton`

**Пропсы:**

- `size` — `"sm"` | `"default"` (у `SelectTrigger`)

```tsx
// ✅ Базовый select
<Select>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Select role..." />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Roles</SelectLabel>
      <SelectItem value="admin">Admin</SelectItem>
      <SelectItem value="editor">Editor</SelectItem>
      <SelectItem value="viewer">Viewer</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>
```

### 4.18 Separator

**Импорт:** `@/components/ui/separator`

```tsx
<Separator />
<Separator orientation="vertical" className="h-4" />
```

### 4.19 Sheet

**Импорт:** `@/components/ui/sheet`
**Экспорт:** `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetFooter`, `SheetClose`

Боковая панель (slide-over). Используется внутри Sidebar для мобильной версии.

```tsx
<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline">Open</Button>
  </SheetTrigger>
  <SheetContent side="right">
    <SheetHeader>
      <SheetTitle>Panel</SheetTitle>
    </SheetHeader>
    Content...
  </SheetContent>
</Sheet>
```

### 4.20 Sidebar

**Импорт:** `@/components/ui/sidebar`
**Экспорт:** `SidebarProvider`, `Sidebar`, `SidebarTrigger`, `SidebarContent`, `SidebarHeader`, `SidebarFooter`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupAction`, `SidebarGroupContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarMenuAction`, `SidebarMenuBadge`, `SidebarMenuSub`, `SidebarMenuSubItem`, `SidebarMenuSubButton`, `SidebarMenuSkeleton`, `SidebarInput`, `SidebarSeparator`, `SidebarInset`, `SidebarRail`, `useSidebar`

**Пропсы `Sidebar`:**

- `side` — `"left"` | `"right"`
- `variant` — `"sidebar"` | `"floating"` | `"inset"`
- `collapsible` — `"offcanvas"` | `"icon"` | `"none"`

```tsx
// ✅ Стандартный layout с sidebar
<SidebarProvider defaultOpen={true}>
  <Sidebar collapsible="icon" variant="sidebar">
    <SidebarHeader>{/* Лого, search... */}</SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Main</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive tooltip="Dashboard">
                <HouseIcon /> Dashboard
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>{/* User menu... */}</SidebarFooter>
  </Sidebar>
  <SidebarInset>
    <header className="flex h-12 items-center gap-2 px-4">
      <SidebarTrigger />
      <Breadcrumb>{/* ... */}</Breadcrumb>
    </header>
    <main className="flex-1 p-4">{/* Page content */}</main>
  </SidebarInset>
</SidebarProvider>
```

### 4.21 Skeleton

**Импорт:** `@/components/ui/skeleton`

```tsx
// ✅ Загрузка
<div className="flex items-center gap-2">
  <Skeleton className="size-8 rounded-full" />
  <div className="flex flex-col gap-1">
    <Skeleton className="h-4 w-32" />
    <Skeleton className="h-3 w-24" />
  </div>
</div>
```

### 4.22 Sonner (Toast-уведомления)

**Импорт:** `@/components/ui/sonner`

Используй `toast()` из `sonner` напрямую (не через обёртку).

### 4.23 Table

**Импорт:** `@/components/ui/table`
**Экспорт:** `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`

```tsx
// ✅ Таблица данных
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
        <TableCell>
          <Badge variant="outline">{item.status}</Badge>
        </TableCell>
        <TableCell className="text-right">
          <Button variant="ghost" size="icon-sm">
            <PencilIcon />
          </Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### 4.24 Tabs

**Импорт:** `@/components/ui/tabs`
**Экспорт:** `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `tabsListVariants`

**Пропсы:**

- `orientation` — `"horizontal"` | `"vertical"` (у `Tabs`)
- `variant` — `"default"` | `"line"` (у `TabsList`)

```tsx
// ✅ Стандартные табы (с фоном)
<Tabs defaultValue="general">
  <TabsList>
    <TabsTrigger value="general">General</TabsTrigger>
    <TabsTrigger value="security">Security</TabsTrigger>
  </TabsList>
  <TabsContent value="general">General settings...</TabsContent>
  <TabsContent value="security">Security settings...</TabsContent>
</Tabs>

// ✅ Line-вариант (как в Chrome)
<Tabs defaultValue="tab1">
  <TabsList variant="line">
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>

// ✅ Вертикальные табы
<Tabs defaultValue="account" orientation="vertical">
  <TabsList>
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="billing">Billing</TabsTrigger>
  </TabsList>
  <TabsContent value="account">Account content</TabsContent>
  <TabsContent value="billing">Billing content</TabsContent>
</Tabs>
```

### 4.25 Textarea

**Импорт:** `@/components/ui/textarea`

```tsx
<Textarea placeholder="Write a message..." rows={4} />
```

### 4.26 Toggle

**Импорт:** `@/components/ui/toggle`
**Экспорт:** `Toggle`, `toggleVariants`

**Пропсы:**

- `variant` — `"default"` | `"outline"`
- `size` — `"default"` | `"sm"` | `"lg"`

```tsx
// ✅ Одиночный toggle
<Toggle aria-label="Toggle bold"><TextBIcon /></Toggle>

// ✅ Outlined toggle
<Toggle variant="outline"><StarIcon /> Favorite</Toggle>
```

### 4.27 ToggleGroup

**Импорт:** `@/components/ui/toggle-group`

Группа связанных toggle-кнопок (например, выравнивание текста).

### 4.28 Tooltip

**Импорт:** `@/components/ui/tooltip`
**Экспорт:** `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`

`TooltipProvider` уже обёрнут в корневом `layout.tsx` — не нужно добавлять повторно.

```tsx
// ✅ Простой tooltip
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon-sm"><InfoIcon /></Button>
  </TooltipTrigger>
  <TooltipContent>Help information</TooltipContent>
</Tooltip>

// ✅ С горячей клавишей
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon-sm"><FloppyDiskIcon /></Button>
  </TooltipTrigger>
  <TooltipContent>
    Save <span data-slot="kbd">⌘S</span>
  </TooltipContent>
</Tooltip>
```

### 4.29 AspectRatio

**Импорт:** `@/components/ui/aspect-ratio`

Для сохранения пропорций изображений/видео.

### 4.30 Calendar (DatePicker)

**Импорт:** `@/components/ui/calendar`
**Экспорт:** `Calendar`, `CalendarDayButton`

Календарь на основе `react-day-picker` v9. Используется внутри Popover для выбора даты.

**Пример с Popover:**

```tsx
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"

;<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" size="sm">
      <CalendarDots />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0" align="start">
    <Calendar mode="single" selected={date} onSelect={setDate} />
  </PopoverContent>
</Popover>
```

### 4.31 Popover

**Импорт:** `@/components/ui/popover`
**Экспорт:** `Popover`, `PopoverTrigger`, `PopoverContent`

Всплывающий контейнер для календаря, меню и другого контента.

### 4.32 EditableBadge

**Импорт:** `@/components/ui/editable-badge`

Бейдж с возможностью inline-редактирования значения. Используется в строках закупок и выполнения для Qty, Price, Total.

**Пропсы:**

- `label` — текст лейбла (например "Кол-во")
- `value` — текущее значение
- `onChange` — callback при изменении
- `formatDisplay` — функция форматирования (например formatMoney)
- `strong` — жирный шрифт для итоговых значений

---

### 4.33 Frame

**Импорт:** `@/components/ui/frame`

Декоративная обёртка с dashed border. Используется на этапе вёрстки для визуального выделения границ компонентов.

```tsx
<Frame className="p-2">
  <p>Содержимое внутри dashed-рамки</p>
</Frame>
```

---

### 4.34 FramedButton

**Импорт:** `@/components/ui/framed-button`

Кнопка, обёрнутая в `Frame`. Композиция Button + декоративная dashed-рамка.

```tsx
<FramedButton variant="outline" size="sm">
  <PlusIcon />
  <span>Добавить</span>
</FramedButton>
```

---

### 4.35 Switch

**Импорт:** `@/components/ui/switch`
**Экспорт:** `Switch`

Toggle-переключатель на основе Radix UI Switch. Используется для бинарных настроек (вкл/выкл).

```tsx
// ✅ Базовое использование
<Switch />

// ✅ Контролируемый
<Switch checked={enabled} onCheckedChange={setEnabled} />

// ✅ С label (композиция через Field)
<Field orientation="horizontal">
  <FieldLabel htmlFor="notifications">
    <FieldTitle>Push-уведомления</FieldTitle>
    <FieldDescription>Получать уведомления о новых проектах</FieldDescription>
  </FieldLabel>
  <Switch id="notifications" checked={notifications} onCheckedChange={setNotifications} />
</Field>
```

### 4.36 Spinner

**Импорт:** `@/components/ui/spinner`
**Экспорт:** `Spinner`

SVG-спиннер с анимацией `animate-spin`. Используется для индикации загрузки внутри кнопок, таблиц и других компонентов.

```tsx
// ✅ Базовое использование
<Spinner />

// ✅ Внутри кнопки (loading state)
<Button disabled>
  <Spinner className="mr-1.5" />
  Loading...
</Button>

// ✅ Произвольный размер
<Spinner className="size-6" />

// ✅ Кастомный цвет через currentColor
<Spinner className="text-muted-foreground" />
```

---

## 5. Layout Patterns

### 5.1 Sidebar + Main (основной layout приложения)

```tsx
// ✅ app/(main)/layout.tsx
<SidebarProvider defaultOpen={true}>
  <Sidebar collapsible="icon">
    <SidebarHeader>{/* Logo */}</SidebarHeader>
    <SidebarContent>{/* Nav menu */}</SidebarContent>
    <SidebarFooter>{/* User */}</SidebarFooter>
  </Sidebar>
  <SidebarInset>
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4" />
      <Breadcrumb>{/* ... */}</Breadcrumb>
    </header>
    <main className="scrollbar-subtle flex-1 overflow-auto p-4">
      {children}
    </main>
  </SidebarInset>
</SidebarProvider>
```

### 5.2 Page Header + Content

```tsx
// ✅ Страница с заголовком и действиями
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

### 5.3 Card Grid

```tsx
// ✅ Сетка карточек (адаптивная)
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {items.map((item) => (
    <Card key={item.id}>{/* ... */}</Card>
  ))}
</div>
```

### 5.4 Form Layout (две колонки)

```tsx
// ✅ Форма с sidebar-навигацией
<div className="flex flex-col gap-6 lg:flex-row">
  <nav className="w-full shrink-0 lg:w-48">{/* Tabs vertical */}</nav>
  <div className="flex-1">
    <FieldSet>
      <FieldGroup>{/* Fields */}</FieldGroup>
    </FieldSet>
  </div>
</div>
```

### 5.5 Split Panels (master-detail)

```tsx
// ✅ Список слева, детали справа
<div className="flex h-full gap-0">
  <div className="scrollbar-subtle w-80 overflow-auto border-r p-4">
    {/* List of items */}
  </div>
  <div className="scrollbar-subtle flex-1 overflow-auto p-4">
    {/* Detail view */}
  </div>
</div>
```

### 5.6 Centered (auth pages, empty states)

```tsx
// ✅ Центрированный контент
<div className="flex min-h-svh items-center justify-center">
  <Card className="w-full max-w-sm">{/* Login form */}</Card>
</div>
```

### 5.7 Flex Row (toolbar / actions)

```tsx
// ✅ Тулбар с действиями
<div className="flex items-center gap-2">
  <Input placeholder="Filter..." className="w-48" />
  <div className="flex-1" />
  <Button variant="outline" size="sm">
    Export
  </Button>
  <Button size="sm">Create</Button>
</div>
```

### 5.8 Sticky Header

```tsx
// ✅ Закреплённый заголовок
<div className="sticky top-0 z-10 border-b bg-background">
  <div className="flex h-12 items-center gap-2 px-4">
    {/* Header content */}
  </div>
</div>
```

---

## 6. Conventions (Правила)

### 6.1 Цвета — только через CSS-переменные

```tsx
// ✅ Правильно
<div className="bg-primary text-primary-foreground">
<div className="text-muted-foreground">
<Button variant="destructive">
<Badge variant="secondary">

// ❌ Запрещено
<div className="bg-[oklch(0.496_0.265_301.924)]">
<div style={{ color: '#7c3aed' }}>
<div className="bg-purple-500">  // ← нет в конфиге
```

### 6.2 Никакого кастомного CSS

```tsx
// ✅ Правильно — Tailwind utility-классы
<div className="flex items-center gap-2 p-4 rounded-lg border">

// ❌ Запрещено
<div className="my-wrapper">  // ← с кастомными стилями в CSS
<style>{`.my-wrapper { display: flex; gap: 8px; }`}</style>
```

**Исключение:** `scrollbar-subtle` и переменные в `globals.css` — это единственные кастомные стили в проекте, уже определённые системой.

### 6.3 Никаких обёрток над shadcn/ui

```tsx
// ✅ Правильно — используй компонент напрямую
import { Button } from "@/components/ui/button"
;<Button variant="destructive" size="sm">
  Delete
</Button>

// ❌ Запрещено — не создавай свои обёртки
import { DestructiveButton } from "@/components/destructive-button" // ← НЕТ
;<DestructiveButton>Delete</DestructiveButton>
```

**Исключение:** Если нужна композиция из нескольких shadcn-компонентов, повторяющаяся 5+ раз — можно создать составной компонент. Но сначала убедись, что нельзя решить через children/пропсы.

### 6.4 Композиция через children — не через правку исходников

```tsx
// ✅ Правильно — композиция
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardAction>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <DotsThreeIcon />
          </Button>
        </DropdownMenuTrigger>
        {/* ... */}
      </DropdownMenu>
    </CardAction>
  </CardHeader>
</Card>

// ❌ Запрещено — не меняй исходники shadcn в components/ui/
// Не добавляй новые пропсы в Button, Card и т.д.
```

### 6.5 Иконки — только Phosphor

```tsx
// ✅ Правильно
import { HouseIcon, GearIcon, UserIcon } from "@phosphor-icons/react"
;<HouseIcon className="size-4" />

// ❌ Запрещено
import { HomeIcon } from "@heroicons/react" // ← не миксовать
import { FiHome } from "react-icons/fi" // ← не миксовать
```

### 6.6 Утилита `cn()` — всегда

```tsx
// ✅ Правильно
import { cn } from "@/lib/utils"
<div className={cn("base-class", condition && "conditional", className)} />

// ❌ Не используй шаблонные строки для мёрджа классов
<div className={`base-class ${condition ? "active" : ""} ${className}`} />
```

### 6.7 Tailwind-классы — порядок

Следуй порядку, рекомендованному Tailwind (Prettier-плагин делает автоматически):

1. Layout (`flex`, `grid`, `absolute`)
2. Sizing (`w-full`, `h-7`, `min-w-0`)
3. Spacing (`p-2`, `gap-4`)
4. Typography (`text-xs`, `font-medium`)
5. Visual (`bg-primary`, `rounded-md`, `border`)
6. Misc (`transition-all`, `outline-none`)

### 6.8 Адаптивность — Tailwind breakpoints

| Breakpoint | Min width | Префикс |
| ---------- | --------- | ------- |
| `sm`       | 640px     | `sm:`   |
| `md`       | 768px     | `md:`   |
| `lg`       | 1024px    | `lg:`   |
| `xl`       | 1280px    | `xl:`   |

```tsx
// ✅ Mobile-first
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
<div className="flex-col md:flex-row">
```

### 6.9 Состояния — aria-атрибуты и data-атрибуты

shadcn/ui активно использует `data-*` и `aria-*` атрибуты для стилизации состояний. Tailwind v4 поддерживает их из коробки:

```tsx
// ✅ Стилизация по data-атрибутам (встроена в компоненты)
data-active:bg-sidebar-accent
data-checked:bg-primary
group-data-[collapsible=icon]:w-(--sidebar-width-icon)
aria-invalid:border-destructive
aria-expanded:bg-muted
```

**Не нужно добавлять свои data-атрибуты для стилизации** — используй те, что уже есть в компонентах.

---

## 6.10 Проверка: фича workspace-settings

**Фича:** `features/workspace-settings/` — 16 компонентов, 1 файл типов, 1 мок-файл.

**Проверка на следование дизайн-системе:**

| Компонент                      | Используемые shadcn/ui примитивы                                                                                | Новый UI-паттерн? |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- | ----------------- |
| `team-management-view`         | Композиция team-only блоков (gap-6) для `/team`: overview, members, manual invite, pending invites, roles       | —                 |
| `workspace-settings-view`      | Catch-all композиция workspace/settings блоков; не используется как primary `/team` flow                        | —                 |
| `workspace-overview-card`      | Card, CardHeader, CardTitle, CardContent, Badge, Separator                                                      | —                 |
| `workspace-members-table`      | Card, CardHeader, CardTitle, CardContent, Table, Badge, Avatar, Select, DropdownMenu, Button, + 4 диалога       | —                 |
| `role-change-dialog`           | Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Select, Button               | —                 |
| `remove-member-dialog`         | Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button (destructive)         | —                 |
| `reset-password-dialog`        | Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button                       | —                 |
| `suspend-member-dialog`        | Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button (destructive/default) | —                 |
| `invite-member-card`           | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Input, Label, Select, Textarea, Button   | —                 |
| `invite-link-card`             | Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Label, Select, Switch, Button                 | —                 |
| `allowed-domains-card`         | Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Input, Label, Switch, Button                  | —                 |
| `pending-invitations-table`    | Card, CardHeader, CardTitle, CardContent, Table, Badge, DropdownMenu, Button                                    | —                 |
| `workspace-roles-summary-card` | Card, CardHeader, CardTitle, CardDescription, CardContent, Badge                                                | —                 |
| `workspace-actions-card`       | Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Separator                                    | —                 |

**Результат:** ✅ Фича полностью следует дизайн-системе. Все 16 компонентов используют только существующие shadcn/ui примитивы. Новых UI-паттернов не введено. Стилизация — только через Tailwind-классы и CSS-переменные (`text-muted-foreground`, `bg-muted/30`, `text-destructive`, `border-dashed`, и т.д.). Иконки — Phosphor.

**Особенности:**

- Используется декоративный стиль `border-dashed` на Card для визуальной группировки UI-only компонентов (используется и в других фичах).
- Mobile-first адаптивность через Tailwind breakpoints (`sm:`, `md:`, `lg:`).
- Диалоги подтверждения действий (изменение роли, удаление, сброс пароля, блокировка) следуют паттерну: `Dialog` + `DialogHeader` (Title + Description) + действие + `DialogFooter` (Cancel/Confirm). Кнопка подтверждения использует `variant="destructive"` для необратимых действий (удаление, блокировка) и `variant="default"` для остальных.
- Композиция без бизнес-логики — все данные через хуки и API (`useWorkspaceMembers` с мутациями).

---

## 7. Ссылки

- **shadcn/ui (radix-mira):** [https://ui.shadcn.com/docs](https://ui.shadcn.com/docs)
- **Tailwind CSS v4:** [https://tailwindcss.com/docs](https://tailwindcss.com/docs)
- **Radix UI Primitives:** [https://www.radix-ui.com/primitives](https://www.radix-ui.com/primitives)
- **Phosphor Icons:** [https://phosphoricons.com](https://phosphoricons.com)
- **oklch цветовое пространство:** [https://oklch.com](https://oklch.com)

---

> **Кратко:** Используй shadcn/ui компоненты напрямую, Tailwind utility-классы, CSS-переменные для цветов и Phosphor для иконок. В 95% случаев этого достаточно без единой строчки кастомного CSS.

---

## Issue #48 UI safety states

- Unimplemented controls must not look functional. Use disabled buttons with concise “скоро”/coming-soon copy or hide the control until a real backend operation exists.
- Dangerous account actions (leave workspace, transfer ownership, deactivate account) remain visible for future discoverability but are disabled and labelled as not yet implemented.
- Access matrix permission checkboxes can be explored locally, but the Save button is disabled/labelled “Сохранить · скоро” until safe persistence exists.
- Social auth buttons are hidden unless OAuth handlers/providers are actually wired; auth forms show email/password-only explanatory copy instead.
