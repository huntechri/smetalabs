import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core"
import { profiles } from "./profiles"

// ── Roles ──
export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  label: text("label").notNull(),
  locked: boolean("locked").notNull().default(false),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// ── Permissions ──
export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull().unique(),
    label: text("label").notNull(),
    groupName: text("group_name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_permissions_group").on(t.groupName)]
)

// ── Role Permissions (join) ──
export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.roleId, t.permissionId] }),
    index("idx_role_permissions_permission_id").on(t.permissionId),
  ]
)

// ── User Roles ──
export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    assignedBy: uuid("assigned_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.roleId] }),
    index("idx_user_roles_user_id").on(t.userId),
    index("idx_user_roles_role_id").on(t.roleId),
    index("idx_user_roles_assigned_by").on(t.assignedBy),
  ]
)
