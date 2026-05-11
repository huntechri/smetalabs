import { NextResponse } from "next/server"

export async function GET() {
  const results: Record<string, unknown> = {}

  // 1. Check DATABASE_URL
  results.DATABASE_URL_exists = !!process.env.DATABASE_URL
  results.DATABASE_URL_prefix = process.env.DATABASE_URL?.substring(0, 30) + "..."

  // 2. Test neon serverless
  try {
    const { Pool } = await import("@neondatabase/serverless")
    const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
    const { rows } = await pool.query("SELECT 1 as test")
    results.neon = { ok: true, rows }
  } catch (e: any) {
    results.neon = { ok: false, message: e.message, code: e.code, stack: e.stack?.split("\n")[0] }
  }

  return NextResponse.json(results)
}
