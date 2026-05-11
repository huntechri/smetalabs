import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

/**
 * prepare: false — обязательно для Supabase PgBouncer (transaction mode).
 * Без этой опции подготовленные выражения (prepared statements) ломаются
 * при работе через пулер соединений, вызывая ошибки запросов.
 */
const client = postgres(process.env.DATABASE_URL!, { prepare: false })
export const db = drizzle(client, { schema })
