import type { Role } from "@/types/roles"
import type {
  PermissionDefinition,
  PermissionGroup,
  PermissionKey,
  RoleDefinition,
} from "../model/access-control-model"

export const accessRoles: RoleDefinition[] = [
  { id: "owner", label: "Владелец", locked: true },
  { id: "admin", label: "Администратор", locked: false },
  { id: "manager", label: "Менеджер", locked: false },
  { id: "estimator", label: "Сметчик", locked: false },
  { id: "viewer", label: "Наблюдатель", locked: false },
]

export const permissionGroups: { id: PermissionGroup; label: string }[] = [
  { id: "projects", label: "Проекты" },
  { id: "estimates", label: "Сметы" },
  { id: "purchases", label: "Закупки" },
  { id: "team", label: "Команда" },
  { id: "billing", label: "Биллинг" },
]

export const permissions: PermissionDefinition[] = [
  // Projects
  { key: "projects.read", label: "Просмотр проектов", group: "projects" },
  { key: "projects.create", label: "Создание проектов", group: "projects" },
  {
    key: "projects.update",
    label: "Редактирование проектов",
    group: "projects",
  },
  { key: "projects.delete", label: "Удаление проектов", group: "projects" },
  // Estimates
  { key: "estimates.read", label: "Просмотр смет", group: "estimates" },
  { key: "estimates.create", label: "Создание смет", group: "estimates" },
  { key: "estimates.update", label: "Редактирование смет", group: "estimates" },
  { key: "estimates.delete", label: "Удаление смет", group: "estimates" },
  // Purchases
  { key: "purchases.read", label: "Просмотр закупок", group: "purchases" },
  { key: "purchases.create", label: "Создание закупок", group: "purchases" },
  {
    key: "purchases.update",
    label: "Редактирование закупок",
    group: "purchases",
  },
  { key: "purchases.delete", label: "Удаление закупок", group: "purchases" },
  // Team
  { key: "team.read", label: "Просмотр команды", group: "team" },
  { key: "team.create", label: "Приглашение участников", group: "team" },
  { key: "team.update", label: "Редактирование ролей", group: "team" },
  { key: "team.delete", label: "Удаление участников", group: "team" },
  { key: "team.manage", label: "Управление командой", group: "team" },
  // Billing
  { key: "billing.read", label: "Просмотр биллинга", group: "billing" },
  { key: "billing.manage", label: "Управление биллингом", group: "billing" },
]

export const defaultPermissionMatrix: Record<Role, PermissionKey[]> = {
  owner: permissions.map((p) => p.key),
  admin: permissions
    .filter((p) => p.key !== "billing.manage")
    .map((p) => p.key),
  manager: permissions
    .filter(
      (p) =>
        p.group === "projects" ||
        p.group === "estimates" ||
        p.group === "purchases" ||
        p.key === "team.read"
    )
    .map((p) => p.key),
  estimator: permissions
    .filter(
      (p) =>
        p.key === "projects.read" ||
        p.group === "estimates" ||
        p.key === "purchases.read"
    )
    .map((p) => p.key),
  viewer: permissions.filter((p) => p.key.endsWith(".read")).map((p) => p.key),
}
