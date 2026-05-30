import { describe, expect, it } from "vitest"
import { buildPermissionMatrix } from "./access-control-model"
import type { ApiRole } from "./access-control-model"

const roles = [
  {
    id: "role-owner",
    name: "owner",
    label: "Владелец",
    locked: true,
    description: null,
    permissions: [
      {
        id: "permission-projects-read",
        key: "projects.read",
        label: "Просмотр проектов",
        groupName: "projects",
        description: null,
      },
      {
        id: "permission-team-read",
        key: "team.read",
        label: "Просмотр команды",
        groupName: "team",
        description: null,
      },
    ],
  },
  {
    id: "role-manager",
    name: "manager",
    label: "Менеджер",
    locked: false,
    description: null,
    permissions: [
      {
        id: "permission-projects-read",
        key: "projects.read",
        label: "Просмотр проектов",
        groupName: "projects",
        description: null,
      },
    ],
  },
] satisfies ApiRole[]

describe("buildPermissionMatrix", () => {
  it("builds roles, de-duplicated permissions, groups, and initial matrix", () => {
    const matrix = buildPermissionMatrix(roles)

    expect(matrix.accessRoles).toEqual([
      { id: "owner", label: "Владелец", locked: true },
      { id: "manager", label: "Менеджер", locked: false },
    ])
    expect(matrix.permissions).toEqual([
      { key: "projects.read", label: "Просмотр проектов", group: "projects" },
      { key: "team.read", label: "Просмотр команды", group: "team" },
    ])
    expect(matrix.permissionGroups).toEqual([
      { id: "projects", label: "Проекты" },
      { id: "team", label: "Команда" },
    ])
    expect(matrix.initialMatrix).toEqual({
      owner: ["projects.read", "team.read"],
      manager: ["projects.read"],
    })
  })

  it("returns empty matrix primitives for an empty roles response", () => {
    expect(buildPermissionMatrix([])).toEqual({
      accessRoles: [],
      permissionGroups: [],
      permissions: [],
      initialMatrix: {},
    })
  })
})
