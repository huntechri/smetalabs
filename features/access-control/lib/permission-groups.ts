import type { PermissionDefinition } from "../types"

export type PermissionGroupDefinition = {
  id: string
  label: string
}

const GROUP_LABELS: Record<string, string> = {
  projects: "Проекты",
  estimates: "Сметы",
  purchases: "Закупки",
  team: "Команда",
  billing: "Биллинг",
}

export function buildPermissionGroups(
  permissions: Pick<PermissionDefinition, "group">[]
): PermissionGroupDefinition[] {
  const groupNames = Array.from(new Set(permissions.map((p) => p.group)))
  return groupNames.map((group) => ({
    id: group,
    label: GROUP_LABELS[group] ?? group,
  }))
}
