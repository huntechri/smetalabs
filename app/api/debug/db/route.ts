import { NextResponse } from "next/server"

export async function GET() {
  const results: Record<string, unknown> = {}
  const raw = process.env.DATABASE_URL || ""

  // Show URL structure without password
  const masked = raw.replace(/\/\/[^:]+:[^@]+@/, "//user:***@")
  results.raw_url = masked

  // Try to parse the URL
  try {
    const u = new URL(raw)
    results.parsed = {
      protocol: u.protocol,
      host: u.hostname,
      port: u.port,
      db: u.pathname,
      hasPassword: !!u.password,
    }
  } catch (e: any) {
    results.parseError = e.message
  }

  // Try neon with raw URL
  try {
    const { Pool } = await import("@neondatabase/serverless")
    const pool = new Pool({ connectionString: raw })
    const { rows } = await pool.query("SELECT 1 as test")
    results.neon_raw = { ok: true, rows }
  } catch (e: any) {
    results.neon_raw = { ok: false, message: e.message || "(empty)", code: e.code, name: e.name }
  }

  // Try neon with decoded URL
  try {
    const decoded = decodeURIComponent(raw)
    const { Pool } = await import("@neondatabase/serverless")
    const pool = new Pool({ connectionString: decoded })
    const { rows } = await pool.query("SELECT 1 as test")
    results.neon_decoded = { ok: true, rows }
  } catch (e: any) {
    results.neon_decoded = { ok: false, message: e.message || "(empty)", code: e.code, name: e.name }
  }

  // Try pg with decoded URL
  try {
    const { Pool } = await import("pg")
    const pool = new Pool({ 
      connectionString: decodeURIComponent(raw),
      ssl: { rejectUnauthorized: false }
    })
    const { rows } = await pool.query("SELECT 1 as test")
    results.pg_decoded = { ok: true, rows }
  } catch (e: any) {
    results.pg_decoded = { ok: false, message: e.message || "(empty)", code: e.code }
  }

  return NextResponse.json(results)
}
