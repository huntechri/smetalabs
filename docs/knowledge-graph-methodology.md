# Knowledge Graph — методология генерации

> v3.0.0 · 2026-05-29 · актуализировано под текущий `master`

---

## 1. Назначение

Knowledge Graph — карта проекта. Она показывает не только список файлов, но и рабочие цепочки: страница, экран, данные, сохранение и база.

В отличие от `docs/filemap.md`, graph показывает:

- связи между файлами;
- автоматические проверки;
- готовность разделов;
- сравнение с документацией;
- места, где раздел обслуживается через общий контур проекта, а не через свою отдельную папку.

---

## 2. Генерация

Полная генерация:

```bash
/understand . --full
node scripts/generate-knowledge-graph.js --from assembled
node scripts/normalize-knowledge-graph-readiness.js
```

Если код не перечитывался, а надо только обновить вывод Graph:

```bash
node scripts/generate-knowledge-graph.js --from existing
node scripts/normalize-knowledge-graph-readiness.js
```

Скрипты:

- `scripts/generate-knowledge-graph.js` — основная сборка;
- `scripts/normalize-knowledge-graph-readiness.js` — уточнение готовности и связей под реальное устройство проекта.

---

## 3. Почему нужен normalize-скрипт

Некоторые разделы в SmetaLabs не имеют своей отдельной серверной папки, потому что они живут внутри проекта и записи сметы.

Это нормально для:

- `purchases` — закупки сметы обслуживаются через `app/api/projects/[id]/estimate-records/[recordId]/purchases/**`;
- `finances` — финансы читают платежи, закупки и содержимое сметы через маршруты записи сметы;
- `execution` — выполнение работает поверх содержимого сметы через общий контур `content/changes/work-coefficient`;
- `team` — команда обслуживается через `app/api/team/**` и `lib/auth/**`;
- `access-control` — права обслуживаются через `app/actions/access-control.ts`, `app/api/access-control/**` и `lib/auth/permissions.ts`.

Без этого уточнения Graph ошибочно пишет `api: false` или `server: false`, хотя данные реально идут через общий путь.

---

## 4. Readiness

Readiness оценивает разделы по признакам:

```json
{
  "page": true,
  "ui": true,
  "hook": true,
  "client": true,
  "api": true,
  "server": true,
  "db": true,
  "tests": false,
  "usesMocks": false,
  "status": "production",
  "serverVia": "..."
}
```

Важно: если раздел работает через общий путь проекта, нужно указывать `serverVia`, `hookVia`, `clientVia` или `dbVia`. Это лучше, чем помечать раздел как неполный.

---

## 5. Актуальные findings

На текущем графе остаются рабочие замечания:

| ID | Что означает | Что делать |
|---|---|---|
| `STUB-001` | Страницы-заглушки `templates`, `templates/[templateId]`, `admin` | Сейчас не трогаем |
| `LARGE-001` | Большие файлы, в первую очередь серверные | Разделять постепенно, когда правим соответствующую область |
| `CROSS-001` | Связи между разделами | Разрешённые бизнес-связи фиксировать в `allowedBusinessConnections` |
| `ISOL-001` | Изолированные файлы | Проверять только если есть конкретные подозрительные файлы |

Устаревшие проблемы, которые не должны возвращаться без подтверждения кодом:

- Finance больше не использует моки.
- Purchases больше не использует моки.
- Старые подозрительные файлы global purchases удалены.
- `features/directories/lib/csv-import-batches.ts` не мусор: его используют импорты работ и материалов.
- Повторяющиеся номера миграций `017`, `018`, `019`, `042` устранены.

---

## 6. Разрешённые бизнес-связи

Эти связи считаются нормальными:

- `dashboard→projects` — дашборд показывает сводку по проектам;
- `projects→directory-counterparties` — выбор заказчика для проекта;
- `global-purchases→projects` — привязка глобальной закупки к проекту;
- `purchases→global-purchases` — закупка сметы может выбирать материал из общего контура закупок;
- `account-settings→workspace-settings` — настройки аккаунта используют API команды;
- `finances→purchases` — финансы читают фактические закупки сметы;
- `estimates→projects` — смета живёт внутри проекта;
- `execution→estimates` — выполнение читает содержимое сметы.

---

## 7. Миграции

Номера миграций должны быть уникальными.

Файлы миграций без числового префикса не считаются дублями, но Graph должен выносить их в отдельную заметку `migrationNotes.unnumberedFiles`, чтобы их было видно при ревизии.

---

## 8. Правила обновления

1. Не коммитить в `master` напрямую.
2. Изменения Graph делать через скрипты.
3. После `generate-knowledge-graph.js` запускать `normalize-knowledge-graph-readiness.js`.
4. Страницы-заглушки `templates` и `admin` не считать срочной проблемой, пока по ним нет задачи.
5. `gitCommit` в Graph должен совпадать с кодом, по которому строилась карта.
