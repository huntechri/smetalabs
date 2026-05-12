import { pgTable, uuid, text, timestamp, pgEnum, index } from "drizzle-orm/pg-core"
import { profiles } from "./profiles"
import { roles } from "./rbac"

export const workspaceMemberStatusEnum = pgEnum("workspace_member_status", [
  "active",
  "invited",
  "suspended",
])

/**
 * workspace_members — участники рабочего пространства (workspace).
 *
 * Каждый пользователь (user_id) привязан к workspace владельца (owner_id).
 * Владелец workspace — это user_id, совпадающий с owner_id, и он же имеет роль owner.
 */
export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    status: workspaceMemberStatusEnum("status").notNull().default("active"),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_workspace_members_owner_id").on(t.ownerId),
    index("idx_workspace_members_status").on(t.status),
  ]
)
