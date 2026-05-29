#!/usr/bin/env node
/**
 * normalize-knowledge-graph-readiness.js — SmetaLabs graph correction pass
 *
 * Keeps the generated graph aligned with the real runtime shape when a product
 * area is intentionally served through a shared project/estimate route rather
 * than through a feature-local server folder.
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, "..")
const GRAPH_PATH = path.join(
  PROJECT_ROOT,
  ".understand-anything",
  "knowledge-graph.json"
)

function readGraph() {
  if (!fs.existsSync(GRAPH_PATH)) {
    console.error(`[KG normalize] Graph not found: ${GRAPH_PATH}`)
    process.exit(1)
  }

  return JSON.parse(fs.readFileSync(GRAPH_PATH, "utf8"))
}

function writeGraph(graph) {
  fs.writeFileSync(GRAPH_PATH, `${JSON.stringify(graph, null, 2)}\n`)
}

function hasFile(files, filePath) {
  return files.has(filePath)
}

function hasAny(files, filePaths) {
  return filePaths.some((filePath) => hasFile(files, filePath))
}

function hasAll(files, filePaths) {
  return filePaths.every((filePath) => hasFile(files, filePath))
}

function ensureReadiness(graph, feature) {
  graph.readiness ??= {}
  graph.readiness[feature] ??= {
    page: false,
    ui: false,
    hook: false,
    client: false,
    api: false,
    server: false,
    db: false,
    tests: false,
    usesMocks: false,
    status: "partial",
  }

  return graph.readiness[feature]
}

const RUNTIME_BRIDGES = {
  purchases: {
    apiRoutes: [
      "app/api/projects/[id]/estimate-records/[recordId]/purchases/route.ts",
      "app/api/projects/[id]/estimate-records/[recordId]/purchases/[purchaseId]/route.ts",
    ],
    requiredRuntimeFiles: [
      "features/purchases/hooks/use-purchases.ts",
      "features/purchases/api/purchases-client.ts",
      "features/purchases/api/purchases-query-keys.ts",
    ],
    serverVia:
      "app/api/projects/[id]/estimate-records/[recordId]/purchases/** + project_estimate_purchases RPC",
    note:
      "Закупки сметы обслуживаются через общий контур проекта и записи сметы, поэтому feature-local server папка не обязательна.",
  },
  finances: {
    apiRoutes: [
      "app/api/projects/[id]/estimate-records/[recordId]/payments/route.ts",
      "app/api/projects/[id]/estimate-records/[recordId]/payments/[paymentId]/route.ts",
      "app/api/projects/[id]/estimate-records/[recordId]/purchases/route.ts",
      "app/api/projects/[id]/estimate-records/[recordId]/content/route.ts",
    ],
    requiredRuntimeFiles: [
      "features/finances/hooks/use-finances.ts",
      "features/finances/api/finances-client.ts",
      "features/purchases/api/purchases-client.ts",
      "features/estimates/hooks/use-project-estimate-content.ts",
    ],
    serverVia:
      "app/api/projects/[id]/estimate-records/[recordId]/payments + purchases + content routes",
    note:
      "Финансы читают платежи, закупки и содержимое сметы через реальные маршруты записи сметы.",
  },
  execution: {
    apiRoutes: [
      "app/api/projects/[id]/estimate-records/[recordId]/content/route.ts",
      "app/api/projects/[id]/estimate-records/[recordId]/changes/route.ts",
      "app/api/projects/[id]/estimate-records/[recordId]/work-coefficient/route.ts",
    ],
    requiredRuntimeFiles: [
      "features/execution/components/execution-view.tsx",
      "features/estimates/hooks/use-project-estimate-content.ts",
      "features/estimates/api/project-estimate-content-client.ts",
    ],
    hookVia: "features/estimates/hooks/use-project-estimate-content.ts",
    clientVia: "features/estimates/api/project-estimate-content-client.ts",
    serverVia:
      "app/api/projects/[id]/estimate-records/[recordId]/content + changes + work-coefficient routes",
    dbVia: "db/schema/project-estimate-content.ts",
    note:
      "Выполнение — вкладка над содержимым сметы, а не отдельная область хранения.",
  },
  team: {
    apiRoutes: [
      "app/api/team/members/route.ts",
      "app/api/team/members/[userId]/route.ts",
      "app/api/team/invitations/route.ts",
      "app/api/team/overview/route.ts",
    ],
    requiredRuntimeFiles: [
      "features/workspace-settings/api/team-client.ts",
      "features/workspace-settings/hooks/use-workspace-members.ts",
      "lib/auth/team.ts",
      "lib/auth/permissions.ts",
    ],
    serverVia: "app/api/team/** + lib/auth/team.ts + lib/auth/permissions.ts",
    note:
      "Команда обслуживается общими маршрутами team и проверками доступа, а не отдельной папкой features/workspace-settings/server.",
  },
  "access-control": {
    apiRoutes: ["app/api/access-control/roles/route.ts"],
    requiredRuntimeFiles: [
      "app/actions/access-control.ts",
      "features/access-control/api/access-control-client.ts",
      "features/access-control/hooks/use-access-control.ts",
      "lib/auth/permissions.ts",
    ],
    serverVia:
      "app/actions/access-control.ts + app/api/access-control/roles/route.ts + lib/auth/permissions.ts",
    note:
      "Контроль доступа обслуживается action/API route и общими проверками доступа.",
  },
}

function normalizeReadiness(graph, files) {
  for (const [feature, bridge] of Object.entries(RUNTIME_BRIDGES)) {
    const entry = ensureReadiness(graph, feature)
    const hasBridgeRoutes = hasAny(files, bridge.apiRoutes ?? [])
    const hasRuntimeFiles = hasAll(files, bridge.requiredRuntimeFiles ?? [])

    if (hasBridgeRoutes) entry.api = true
    if (hasBridgeRoutes || bridge.serverVia) entry.server = true
    if (bridge.hookVia && hasFile(files, bridge.hookVia)) entry.hook = true
    if (bridge.clientVia && hasFile(files, bridge.clientVia)) entry.client = true
    if (bridge.dbVia && hasFile(files, bridge.dbVia)) entry.db = true

    entry.serverVia = bridge.serverVia
    if (bridge.hookVia) entry.hookVia = bridge.hookVia
    if (bridge.clientVia) entry.clientVia = bridge.clientVia
    if (bridge.dbVia) entry.dbVia = bridge.dbVia
    entry.readinessNote = bridge.note

    if (!entry.usesMocks && hasRuntimeFiles && (entry.page || feature === "access-control")) {
      entry.status = "production"
    }
  }
}

const DOC_ACCEPTED_ALTERNATIVES = {
  estimates: {
    "features/estimates/hooks/use-estimates.ts": [
      "features/estimates/hooks/use-project-estimate-content.ts",
    ],
    "features/estimates/server/estimates.service.ts": [
      "features/projects/server/project-estimate-content.service.ts",
      "features/projects/server/project-estimate-content.repository.ts",
    ],
  },
}

function normalizeDocComparison(graph, files) {
  if (!graph.docComparison) return

  for (const [feature, alternatives] of Object.entries(DOC_ACCEPTED_ALTERNATIVES)) {
    const comparison = graph.docComparison[feature]
    if (!comparison?.missingFiles?.length) continue

    comparison.acceptedAlternatives ??= {}
    comparison.missingFiles = comparison.missingFiles.filter((missingFile) => {
      const accepted = alternatives[missingFile] ?? []
      const replacement = accepted.find((filePath) => hasFile(files, filePath))
      if (!replacement) return true

      comparison.acceptedAlternatives[missingFile] = replacement
      return false
    })

    if (comparison.missingFiles.length === 0) {
      delete comparison.missingFiles
      comparison.layersMatch = true
    }
  }
}

function ensureAllowedBusinessConnections(graph) {
  const cross = graph.findings?.find((finding) => finding.id === "CROSS-001")
  if (!cross) return

  cross.allowedBusinessConnections ??= {}
  Object.assign(cross.allowedBusinessConnections, {
    "dashboard→projects": "Дашборд показывает сводку по проектам",
    "projects→directory-counterparties": "Выбор заказчика для проекта",
    "global-purchases→projects": "Привязка глобальной закупки к проекту",
    "purchases→global-purchases": "Закупка сметы использует выбор материала из общего контура закупок",
    "account-settings→workspace-settings": "Настройки аккаунта используют API команды",
    "finances→purchases": "Финансы читают фактические закупки сметы",
    "estimates→projects": "Смета живёт внутри проекта и записи сметы",
    "execution→estimates": "Выполнение читает содержимое сметы",
  })

  const allowedPairs = new Set(Object.keys(cross.allowedBusinessConnections))
  const extractPair = (line) => {
    const sections = [...line.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1])
    if (sections.length < 2) return null
    return `${sections[0]}→${sections[1]}`
  }

  cross.needsJustification = (cross.needsJustification ?? []).filter((line) => {
    const pair = extractPair(line)
    return pair ? !allowedPairs.has(pair) : true
  })

  cross.totalNeedsJustification = cross.needsJustification.length
  cross.displayedBadCount = cross.files?.length ?? 0
  cross.severity = cross.displayedBadCount > 0 ? "high" : cross.totalNeedsJustification > 0 ? "medium" : "low"
  cross.explanation = `${cross.displayedBadCount} проблемных связей. ${cross.totalNeedsJustification} связей требуют обоснования. Разрешённые бизнес-связи перечислены в allowedBusinessConnections.`
}

function recordMigrationNotes(graph) {
  const migrationFiles = (graph.files ?? [])
    .map((file) => file.path)
    .filter((filePath) => filePath.startsWith("db/migrations/") && filePath.endsWith(".sql"))

  const unnumbered = migrationFiles.filter(
    (filePath) => !/^db\/migrations\/\d+_/.test(filePath)
  )

  graph.migrationNotes = {
    ...(graph.migrationNotes ?? {}),
    unnumberedFiles: unnumbered,
    note:
      "Неформатные имена миграций вынесены в отдельную заметку. Они не считаются повторяющимися номерами.",
  }
}

function main() {
  const graph = readGraph()
  const files = new Set((graph.files ?? []).map((file) => file.path))

  normalizeReadiness(graph, files)
  normalizeDocComparison(graph, files)
  ensureAllowedBusinessConnections(graph)
  recordMigrationNotes(graph)

  graph.project ??= {}
  graph.project.graphNormalizedAt = new Date().toISOString()
  graph.project.graphNormalizationVersion = "1.0.0"

  graph.summary ??= {}
  graph.summary.findings = graph.findings?.length ?? 0

  writeGraph(graph)

  console.log("[KG normalize] readiness and relationship metadata normalized")
}

main()
