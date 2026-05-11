import { createClient } from '@supabase/supabase-js'

/**
 * Supabase-клиент с SERVICE_ROLE_KEY для серверных запросов.
 *
 * Используется в API-роутах и Server Actions.
 * SERVICE_ROLE_KEY обходит Row Level Security (RLS) —
 * это нормально для серверного кода, где авторизация
 * проверяется через supabase.auth.getUser() перед запросом.
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export { supabase }
