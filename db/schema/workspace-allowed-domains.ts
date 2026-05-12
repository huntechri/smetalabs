import { pgTable, uuid, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core"
import { profiles } from "./profiles"

/**
 * workspace_allowed_domains — разрешённые домены для авто-присоединения к workspace.
 *
 * Уникальность: (domain, owner_id) — один домен на workspace.
 */
export const workspaceAllowedDomains = pgTable(
  "workspace_allowed_domains",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    domain: text("domain").notNull(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    addedBy: uuid("added_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_workspace_allowed_domains_domain_owner")
      .on(t.domain, t.ownerId),
    index("idx_workspace_allowed_domains_owner_id").on(t.ownerId),
    index("idx_workspace_allowed_domains_added_by").on(t.addedBy),
  ]
)
