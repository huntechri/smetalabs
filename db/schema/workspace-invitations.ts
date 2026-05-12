import { sql } from "drizzle-orm"
import { pgTable, uuid, text, timestamp, pgEnum, uniqueIndex, index } from "drizzle-orm/pg-core"
import { profiles } from "./profiles"
import { roles } from "./rbac"

export const invitationStatusEnum = pgEnum("invitation_status", ["pending", "expired"])

/**
 * workspace_invitations — приглашения в рабочее пространство.
 *
 * Уникальность: (email, owner_id) — нельзя пригласить один email
 * в один workspace дважды (пока приглашение pending).
 */
export const workspaceInvitations = pgTable(
  "workspace_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    message: text("message"),
    invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    status: invitationStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_workspace_invitations_email_owner")
      .on(t.email, t.ownerId),
    index("idx_workspace_invitations_status").on(t.status),
    index("idx_workspace_invitations_role_id").on(t.roleId),
    index("idx_workspace_invitations_owner_id").on(t.ownerId),
    index("idx_workspace_invitations_invited_by").on(t.invitedBy),
    index("idx_workspace_invitations_expires_at_pending")
      .on(t.expiresAt)
      .where(sql`${t.status} = 'pending'`), // partial index
  ]
)
