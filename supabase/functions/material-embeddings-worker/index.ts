import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const MODEL_NAME = "text-embedding-3-small"
const DIMENSIONS = 1536
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 20

type QueueRow = {
  id: string
  workspace_owner_id: string
  embedding_input_text: string
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function parseLimit(req: Request) {
  const url = new URL(req.url)
  const raw = Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT)
  return Math.max(
    1,
    Math.min(Number.isFinite(raw) ? Math.floor(raw) : DEFAULT_LIMIT, MAX_LIMIT)
  )
}

function toVectorLiteral(values: number[]) {
  return `[${values.map((value) => Number(value).toFixed(8)).join(",")}]`
}

async function createEmbedding(input: string) {
  const apiKey = Deno.env.get("OPENAI_API_KEY")
  if (!apiKey) return { disabled: true as const, embedding: null }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input, model: MODEL_NAME }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(text || "OpenAI embedding request failed")
  }

  const payload = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>
  }
  const embedding = payload.data?.[0]?.embedding

  if (!embedding || embedding.length !== DIMENSIONS) {
    throw new Error("OpenAI returned invalid embedding")
  }

  return { disabled: false as const, embedding }
}

Deno.serve(async (req) => {
  const workerSecret = Deno.env.get("MATERIAL_EMBEDDINGS_WORKER_SECRET")
  const receivedSecret = req.headers.get("x-smetalabs-worker-secret")

  if (!workerSecret || receivedSecret !== workerSecret) {
    return json({ error: "unauthorized" }, 401)
  }

  if (!Deno.env.get("OPENAI_API_KEY")) {
    return json({
      data: {
        enabled: false,
        enqueued: 0,
        processed: 0,
        failed: 0,
        skipped: 0,
      },
    })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "supabase_env_missing" }, 500)
  }

  const limit = parseLimit(req)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: enqueued, error: enqueueError } = await supabase.rpc(
    "enqueue_missing_directory_material_embeddings",
    { p_limit: limit }
  )

  if (enqueueError) return json({ error: enqueueError.message }, 500)

  const { data: rows, error: readError } = await supabase
    .from("directory_material_embeddings")
    .select("id,workspace_owner_id,embedding_input_text")
    .eq("model_name", MODEL_NAME)
    .eq("dimensions", DIMENSIONS)
    .in("status", ["pending", "failed"])
    .order("updated_at", { ascending: true })
    .limit(limit)

  if (readError) return json({ error: readError.message }, 500)

  let processed = 0
  let failed = 0

  for (const row of (rows ?? []) as QueueRow[]) {
    try {
      const result = await createEmbedding(row.embedding_input_text)
      if (result.disabled) break

      const { error: updateError } = await supabase
        .from("directory_material_embeddings")
        .update({
          embedding: toVectorLiteral(result.embedding),
          status: "ready",
          generated_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("workspace_owner_id", row.workspace_owner_id)
        .eq("id", row.id)

      if (updateError) throw updateError
      processed += 1
    } catch (err) {
      failed += 1
      await supabase
        .from("directory_material_embeddings")
        .update({
          status: "failed",
          last_error: err instanceof Error ? err.message : "embedding_failed",
        })
        .eq("workspace_owner_id", row.workspace_owner_id)
        .eq("id", row.id)
    }
  }

  return json({
    data: {
      enabled: true,
      enqueued: typeof enqueued === "number" ? enqueued : 0,
      processed,
      failed,
      skipped: Math.max(0, limit - processed - failed),
    },
  })
})
