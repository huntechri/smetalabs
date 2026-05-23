import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { profiles } from "./profiles"

/**
 * notifications — системные уведомления для пользователей.
 * Включают как in-app уведомления, так и признаки real-time отправки.
 *
 * PK: id
 * FK: recipient_id -> profiles.id
 * FK: workspace_owner_id -> profiles.id (контекст воркспейса для изоляции данных)
 * FK: actor_id -> profiles.id (инициатор события)
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    workspaceOwnerId: uuid("workspace_owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(), // e.g., 'project_updated', 'estimate_approved', etc.
    title: text("title").notNull(),
    body: text("body").notNull(),
    link: text("link"), // URL для перехода
    metadata: jsonb("metadata").notNull().default({}), // доп. динамические данные
    readAt: timestamp("read_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_notifications_recipient_read")
      .on(t.recipientId, t.readAt)
      .where(sql`archived_at IS NULL`),
    index("idx_notifications_recipient_created").on(t.recipientId, t.createdAt),
    index("idx_notifications_workspace").on(t.workspaceOwnerId),
  ]
)
