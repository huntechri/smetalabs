# Стратегия тестирования

> 2026-05-22

## Текущее состояние

**Тестовый фреймворк не настроен.** В проекте отсутствуют:

- `vitest.config.ts` / `jest.config.ts` — нет конфигурации тестового раннера
- `*.test.ts` / `*.spec.ts` — нет ни одного тестового файла
- Скрипты `test` / `test:watch` — не добавлены в `package.json`

Доступные скрипты проверки качества (из `package.json`):

```bash
pnpm lint        # ESLint — статический анализ
pnpm format      # Prettier — форматирование
pnpm typecheck   # TypeScript — проверка типов (tsc --noEmit)
```

## План внедрения

### Уровень 1: TypeScript (✅ реализовано)

`tsconfig.json` включает `"strict": true` — строгая типизация на уровне компиляции. Все файлы проходят проверку через `pnpm typecheck`.

### Уровень 2: Unit-тесты (🔜 планируется)

**Рекомендуемый стек:** Vitest + React Testing Library

```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom
```

**Структура тестов:**
```
features/<module>/
  __tests__/
    ComponentName.test.tsx    # Тесты компонентов
    hooks.test.ts             # Тесты хуков
  __mocks__/                  # MSW-моки (уже существуют)
```

**Конфигурация `vitest.config.ts`:**
```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

**Скрипты в `package.json`:**
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

### Уровень 3: Интеграционные тесты (🔜 планируется)

- Тесты API-роутов (Next.js Route Handlers) + Supabase
- Тесты взаимодействия между модулями
- Возможный инструмент: MSW для мокирования Supabase-запросов

### Уровень 4: E2E-тесты (🔜 планируется)

- Сквозные тесты пользовательских сценариев
- Инструменты на выбор: Playwright или Cypress
- Критические пути:
  - Авторизация (login/signup/forgot-password)
  - Создание сметы (полный flow)
  - Работа со справочниками (CRUD)

## Моки

В проекте уже существует **8 директорий `__mocks__/`** с данными-заглушками:

| Модуль | Файл |
|---|---|
| `directory-counterparties` | `directory-counterparties.ts` (5 KB) |
| `directory-materials` | `directory-materials.ts` (2 KB) |
| `directory-suppliers` | `directory-suppliers.ts` (2 KB) |
| `directory-works` | `directory-works.ts` (2 KB) |
| `estimates` | `estimates.ts` (1.5 KB) |
| `execution` | `execution.ts` (2 KB) |
| `global-purchases` | `global-purchases.ts` (2 KB) |
| `purchases` | `purchases.ts` (2 KB) |

Эти моки используются во время фронтенд-разработки. После внедрения Vitest они будут переиспользованы для unit-тестов.

## Рекомендации

1. **Начать с Vitest** — минимальный порог входа, нативная поддержка TypeScript
2. **Покрыть справочники первыми** — они имеют готовые моки и стабильный CRUD-интерфейс
3. **Добавить тесты в CI** — запускать `pnpm test` при каждом PR
4. **Целевое покрытие:** 70%+ для утилит и хуков, 50%+ для UI-компонентов
