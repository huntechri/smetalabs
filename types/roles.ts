export type Role = "owner" | "admin" | "manager" | "estimator" | "viewer"

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Владелец",
  admin: "Администратор",
  manager: "Менеджер",
  estimator: "Сметчик",
  viewer: "Наблюдатель",
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner:
    "Полный доступ ко всем ресурсам workspace. Может управлять командой, биллингом и удалять workspace.",
  admin:
    "Управление участниками, настройками и проектами. Не может удалить workspace или передать права владельца.",
  manager:
    "Создание и редактирование смет, управление проектами и закупками. Ограниченный доступ к настройкам команды.",
  estimator:
    "Создание и редактирование смет. Доступ только к назначенным проектам.",
  viewer:
    "Просмотр смет и проектов без возможности редактирования. Доступ только для чтения.",
}
