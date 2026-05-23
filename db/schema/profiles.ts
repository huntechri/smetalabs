import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core"

/**
 * Профиль пользователя — публичное расширение auth.users (Supabase Auth).
 * Создаётся автоматически триггером при регистрации.
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // → auth.users.id
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  workspaceName: text("workspace_name"),
  workspaceLogo: text("workspace_logo"),
  phone: text("phone"),
  position: text("position"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})
