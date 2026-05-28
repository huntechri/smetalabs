# Knowledge Graph — методология генерации

> v2.9.0 · 2026-05-28 · 618 файлов · 1502 связи · 20 типов · 7 findings

---

## 1. Назначение

Knowledge graph — карта проекта, показывающая не просто список файлов, а **рабочие цепочки**: от страницы через компоненты, хуки, API-клиенты, серверный слой к базе данных.

В отличие от filemap, graph показывает:
- Связи между файлами (кто кого импортирует, вызывает, использует)
- Автоматические проверки (findings): моки в продакшене, дубли миграций, изолированные файлы
- Готовность разделов (readiness): какие слои реализованы, где моки
- Сравнение с документацией (docComparison)

---

## 2. Генерация

### 2.1. Как сгенерировать граф

**Двухэтапный процесс:**

```bash
# Этап 1: собрать базовый граф через understand skill
/understand . --full

# Этап 2: применить пост-обработку SmetaLabs
node scripts/generate-knowledge-graph.js --from assembled
```

При изменении только логики пост-обработки (а не кода):
```bash
node scripts/generate-knowledge-graph.js --from existing
```

**Скрипт:** `scripts/generate-knowledge-graph.js`

### 2.2. Что делает скрипт (10 фаз)

1. **P1 — Load & normalize:** загрузка assembled-graph.json или existing knowledge-graph.json
2. **P2 — Descriptions:** генерация описаний по пути/структуре, confidence (high/medium/low)
3. **P3 — Sections:** разбивка features-root, `featureSections`, `routeSection`, привязка schema→feature
4. **P4 — Full import scan:** чтение всех `.ts/.tsx` файлов, разрешение относительных импортов
5. **P5 — Connections rebuild:** 20 типов связей (composes-screen, uses-ui, api-call, dispatches-event…)
6. **P6 — Findings:** MOCK-001, STUB-001, CIRC-001, ISOL-001, LARGE-001, CROSS-001, MIGRATION-001
7. **P7 — Readiness:** оценка 14 разделов с алиасами (team→workspace-settings, estimates→projects)
8. **P8 — SectionChains:** цепочки слоёв на раздел
9. **P9 — DocComparison:** сверка с `features/*/docs/README.md`
10. **P10 — CrossSectionRules & Save:** правила разрешённых/подозрительных связей, запись

### 2.3. Повторная генерация

При изменении кода → Этап 1 + Этап 2. Обновляется `sourceAnalyzedAt`.

При изменении только логики графа → только Этап 2 с `--from existing`, `sourceAnalyzedAt` не меняется.

---

## 3. Структура knowledge-graph.json

```json
{
  "project": { "name", "stack", "gitCommit", "sourceAnalyzedAt", "graphGeneratedAt", "graphVersion" },
  "summary": { "totalFiles", "totalConnections", "totalSections", "layers", "edgeTypes", "findings" },
  "files": [{ "path", "layer", "section", "routeSection", "featureSection", "featureSections", "status", "description", "confidence", "incomingConnections", "outgoingConnections", "incomingCount", "outgoingCount" }],
  "connections": [{ "source", "target", "type", "sourceSection", "targetSection" }],
  "sectionChains": { "sectionName": [{ "layer", "files" }] },
  "readiness": { "featureName": { "page", "ui", "hook", "client", "api", "server", "db", "tests", "usesMocks", "status" } },
  "findings": [{ "id", "severity", "title", "explanation" }],
  "docComparison": { "featureName": { "layersMatch", "missingLayers", "missingFiles", "unusedFiles" } },
  "crossSectionRules": { "allowed", "suspicious", "requiresJustification" }
}
```

---

## 4. Типы связей (20)

| Тип | Описание | Пример |
|---|---|---|
| `composes-screen` | Страница собирает экран | `page.tsx → projects-view.tsx` |
| `uses-component` | Компонент использует компонент | `card.tsx → badge.tsx` |
| `uses-ui` | Использование shadcn/ui | `dialog.tsx → button.tsx` |
| `uses-hook` | Вызов хука | `view.tsx → use-projects.ts` |
| `api-call` | Вызов API-клиента | `use-projects.ts → projects-client.ts` |
| `query-keys` | Ключи React Query | `use-projects.ts → projects-query-keys.ts` |
| `calls-handler` | API-роут → route-handler | `route.ts → projects.route-handlers.ts` |
| `calls-service` | Handler → service | `route-handlers.ts → projects.service.ts` |
| `queries-data` | Service → repository | `projects.service.ts → projects.repository.ts` |
| `uses-schema` | Использование схемы БД | `repository.ts → db/schema/projects.ts` |
| `uses-database` | Подключение к БД | `repository.ts → db/index.ts` |
| `uses-server` | Использование серверного слоя | `route.ts → server/*.ts` |
| `uses-type` | Импорт типов | `view.tsx → types/project.ts` |
| `uses-lib` | Импорт утилит | `view.tsx → lib/utils.ts` |
| `uses-errors` | Импорт shared-ошибок | `route.ts → projects-errors.ts` |
| `validates` | Zod-валидация | `route-handlers.ts → projects.schemas.ts` |
| `dispatches-event` | Отправка события | `toolbar.tsx → materials-events.ts` |
| `listens-event` | Прослушивание события | `materials-events.ts → section.tsx` |
| `uses-mock` | Импорт моков (проблема) | `use-finances.ts → purchases/__mocks__` |
| `tests` | Тестовый импорт | `*.test.ts → tested-file.ts` |

---

## 5. Findings (7)

| ID | Severity | Что проверяет |
|---|---|---|
| MOCK-001 | high | Моки в production-коде (4 файла, finances — критично) |
| STUB-001 | medium | Страницы-заглушки без рабочих экранов (templates, admin) |
| CIRC-001 | high | Круговые зависимости (access-control client ↔ hook) |
| ISOL-001 | low | Изолированные файлы без связей (3 подозрительных) |
| LARGE-001 | medium | Большие файлы >25KB, разделены на runtime/server/migration/docs |
| CROSS-001 | medium | Подозрительные межфичевые связи (1 плохая + dbRelations + allowed biz) |
| MIGRATION-001 | medium | Повторяющиеся номера миграций (4 пары: 17, 18, 19, 42) |

---

## 6. Readiness

Оценивает 14 разделов по слоям: `page`, `ui`, `hook`, `client`, `api`, `server`, `db`, `tests`, `usesMocks`.

Статусы: `production` (все слои есть) / `partial` (есть моки или неполный набор) / `stub` (почти пустой).

Алиасы для разделов с разнесённой логикой:
- `team` → `workspace-settings`
- `settings` → `account-settings` + `workspace-settings`
- `estimates` → `projects`

---

## 7. CrossSectionRules

Правила проверки межфичевых связей:

**Разрешённые:** `app/* → features/*`, `features/* → components/ui/*`, `features/* → lib/*`, `features/* → types/*`, `features/*/server/* → db/*`

**Подозрительные:** `components/ui/* → features/*`, `db/* → features/*`, `features/*/hooks/* → __mocks__/*`

**Требуют обоснования:** `features/X/* → features/Y/*` (разные фичи)

**Разрешённые бизнес-связи:** projects→directory-counterparties, global-purchases→projects, purchases→global-purchases, account-settings→workspace-settings, finances→purchases, estimates→projects, execution→estimates

---

## 8. Правила обновления

1. Не коммитить в master напрямую
2. Изменения графа — через скрипты, не вручную
3. При изменении кода → полная перегенерация
4. При изменении логики → патч-скрипт + `codeNotReRead: true`
5. Синхронизация `incomingConnections`/`outgoingConnections` ↔ `connections` — обязательна
6. `gitCommit` в графе должен совпадать с HEAD на момент генерации

---

## 9. Связанные файлы

- `.understand-anything/knowledge-graph.json` — сам граф (результат)
- `docs/filemap.md` — статическая карта проекта (ручная)
- `docs/backend-architecture.md` — схема БД
- `docs/design-system.md` — UI-компоненты
- `features/*/docs/README.md` — документация фич (используется в docComparison)
