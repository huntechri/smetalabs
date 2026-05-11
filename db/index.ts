import { drizzle } from "drizzle-orm/postgres-js"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

/**
 * Ленивая инициализация клиента БД.
 * На Vercel serverless модуль загружается при импорте — если env нет или
 * соединение падает, ошибка всплывает как 500 на первом же запросе.
 * try-catch даёт читаемый стек при отладке.
 */
type DbClient = PostgresJsDatabase<typeof schema>

let dbInstance: DbClient | null = null

function getDb(): DbClient {
  if (dbInstance) return dbInstance

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set")
  }

  // Декодируем URL на случай спецсимволов в пароле (encodeURI/decodeURI)
  const rawUrl = process.env.DATABASE_URL
  let url: string
  try {
    url = decodeURIComponent(rawUrl)
  } catch {
    url = rawUrl
  }

  try {
    const client = postgres(url, {
      // Подготовленные выражения ломаются при PgBouncer в transaction mode.
      // На порту 5432 (session mode) prepare: false не обязателен, но безвреден.
      prepare: false,

      // Supabase требует SSL для внешних подключений (Vercel → Supabase).
      // rejectUnauthorized: false нужен, если Supabase использует самоподписанный сертификат.
      // "require" — если проверка CN не важна.
      ssl: "require",

      // Vercel serverless: каждый инстанс создаёт новое подключение.
      // Без max: 1 при холодных стартах пул Supabase быстро исчерпывается.
      max: 1,

      // Таймаут простоя: освобождаем слоты, занятые висящими serverless-инстансами.
      idle_timeout: 20,

      // Таймаут соединения
      connect_timeout: 10,
    })

    dbInstance = drizzle(client, { schema })
    return dbInstance
  } catch (error) {
    console.error("[DB] Failed to connect to Supabase:", error)
    throw error
  }
}

// Экспортируем db как геттер — клиент создаётся при первом обращении
export const db = new Proxy({} as DbClient, {
  get(_target, prop) {
    const database = getDb()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-member-access
    return (database as unknown as Record<string | symbol, unknown>)[prop]
  },
})
