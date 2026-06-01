import { createHash } from "node:crypto"
import { supabase } from "@/db"
import { DirectoryWorksApiError } from "../api/directory-works-errors"
import type {
  DirectoryWork,
  DirectoryWorkAiSearchInput,
  DirectoryWorkAiSearchResponse,
  DirectoryWorkEmbeddingProcessResponse,
} from "../model/directory-works-model"
import {
  mapDirectoryWorkRow,
  type DirectoryWorkRpcRow,
} from "../api/directory-works-mappers"

export const DIRECTORY_WORK_EMBEDDING_MODEL = "text-embedding-3-small"
export const DIRECTORY_WORK_EMBEDDING_DIMENSIONS = 1536
export const DIRECTORY_WORK_EMBEDDING_DISTANCE_OPERATOR = "cosine" as const
export const DIRECTORY_WORK_EMBEDDING_DEFAULT_THRESHOLD = 0.72
export const DIRECTORY_WORK_EMBEDDING_BATCH_SIZE = 20

const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings"

type EmbeddingQueueRow = {
  work_id: string
  embedding_input_text: string
  content_hash: string
  status: "pending" | "stale" | "failed"
}

type HybridSearchRpcRow = DirectoryWorkRpcRow & {
  semantic_score: number | string | null
  text_score: number | string | null
  hybrid_score: number | string
  match_reason: DirectoryWorkAiSearchResponse["data"][number]["matchReason"]
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function normalizedHash(value: string) {
  return createHash("sha256").update(value.trim()).digest("hex")
}

function vectorLiteral(embedding: number[]) {
  return `[${embedding.map((value) => Number(value).toFixed(10)).join(",")}]`
}

export function buildDirectoryWorkEmbeddingInput(work: DirectoryWork) {
  return [
    `Название: ${work.title}`,
    `Категория: ${work.category}`,
    work.subcategory ? `Подкатегория: ${work.subcategory}` : null,
    `Единица: ${work.unitLabel || work.unitCode}`,
    `Тип цены: ${work.priceKind}`,
    work.description ? `Описание: ${work.description}` : null,
    work.includedOperations ? `Включено: ${work.includedOperations}` : null,
    work.excludedOperations ? `Исключено: ${work.excludedOperations}` : null,
    work.aliases.length > 0 ? `Синонимы: ${work.aliases.join("; ")}` : null,
    work.keywords.length > 0
      ? `Ключевые слова: ${work.keywords.join("; ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n")
}

export async function enqueueDirectoryWorkEmbedding(
  workspaceOwnerId: string,
  work: DirectoryWork
) {
  const embeddingInputText = buildDirectoryWorkEmbeddingInput(work)
  const contentHash = normalizedHash(embeddingInputText)

  const { error: staleError } = await supabase
    .from("directory_work_embeddings")
    .update({ status: "stale" })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("work_id", work.id)
    .eq("model_name", DIRECTORY_WORK_EMBEDDING_MODEL)
    .neq("content_hash", contentHash)
    .in("status", ["pending", "ready", "failed"])

  if (staleError) throw staleError

  const { error } = await supabase.from("directory_work_embeddings").upsert(
    {
      workspace_owner_id: workspaceOwnerId,
      work_id: work.id,
      model_name: DIRECTORY_WORK_EMBEDDING_MODEL,
      dimensions: DIRECTORY_WORK_EMBEDDING_DIMENSIONS,
      content_hash: contentHash,
      embedding_input_text: embeddingInputText,
      status: "pending",
      last_error: null,
    },
    {
      onConflict: "workspace_owner_id,work_id,model_name,content_hash",
    }
  )

  if (error) throw error
}

export async function enqueueDirectoryWorkEmbeddings(
  workspaceOwnerId: string,
  works: DirectoryWork[]
) {
  for (const work of works) {
    await enqueueDirectoryWorkEmbedding(workspaceOwnerId, work)
  }
}

export async function markDirectoryWorkEmbeddingStale(
  workspaceOwnerId: string,
  work: DirectoryWork
) {
  await enqueueDirectoryWorkEmbedding(workspaceOwnerId, work)
}

async function createEmbedding(input: string) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new DirectoryWorksApiError(
      "INTERNAL_ERROR",
      "OPENAI_API_KEY не настроен для генерации embeddings",
      500
    )
  }

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input,
      model: DIRECTORY_WORK_EMBEDDING_MODEL,
      dimensions: DIRECTORY_WORK_EMBEDDING_DIMENSIONS,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(
      `OpenAI embeddings request failed: ${response.status} ${text}`
    )
  }

  const json = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>
  }
  const embedding = json.data?.[0]?.embedding

  if (!embedding || embedding.length !== DIRECTORY_WORK_EMBEDDING_DIMENSIONS) {
    throw new Error("OpenAI embeddings response returned unexpected dimensions")
  }

  return embedding
}

export async function processDirectoryWorkEmbeddingQueue(
  workspaceOwnerId: string,
  limit = DIRECTORY_WORK_EMBEDDING_BATCH_SIZE
): Promise<DirectoryWorkEmbeddingProcessResponse> {
  const { data, error } = await supabase
    .from("directory_work_embeddings")
    .select("work_id, embedding_input_text, content_hash, status")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("model_name", DIRECTORY_WORK_EMBEDDING_MODEL)
    .eq("dimensions", DIRECTORY_WORK_EMBEDDING_DIMENSIONS)
    .in("status", ["pending", "stale", "failed"])
    .order("updated_at", { ascending: true })
    .limit(Math.min(Math.max(limit, 1), DIRECTORY_WORK_EMBEDDING_BATCH_SIZE))

  if (error) throw error

  let processed = 0
  let failed = 0
  const rows = (data ?? []) as EmbeddingQueueRow[]

  for (const row of rows) {
    try {
      const embedding = await createEmbedding(row.embedding_input_text)
      const { error: updateError } = await supabase
        .from("directory_work_embeddings")
        .update({
          embedding: vectorLiteral(embedding),
          status: "ready",
          generated_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("workspace_owner_id", workspaceOwnerId)
        .eq("work_id", row.work_id)
        .eq("model_name", DIRECTORY_WORK_EMBEDDING_MODEL)
        .eq("content_hash", row.content_hash)

      if (updateError) throw updateError
      processed += 1
    } catch (err) {
      failed += 1
      await supabase
        .from("directory_work_embeddings")
        .update({
          status: "failed",
          last_error:
            err instanceof Error ? err.message : "Embedding generation failed",
        })
        .eq("workspace_owner_id", workspaceOwnerId)
        .eq("work_id", row.work_id)
        .eq("model_name", DIRECTORY_WORK_EMBEDDING_MODEL)
        .eq("content_hash", row.content_hash)
    }
  }

  const { count } = await supabase
    .from("directory_work_embeddings")
    .select("id", { count: "exact", head: true })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("model_name", DIRECTORY_WORK_EMBEDDING_MODEL)
    .in("status", ["pending", "stale", "failed"])

  return {
    data: {
      processed,
      failed,
      pending: count ?? 0,
      modelName: DIRECTORY_WORK_EMBEDDING_MODEL,
      dimensions: DIRECTORY_WORK_EMBEDDING_DIMENSIONS,
    },
  }
}

function mapHybridSearchRow(row: HybridSearchRpcRow) {
  const work = mapDirectoryWorkRow(row)
  return {
    ...work,
    semanticScore:
      row.semantic_score === null || row.semantic_score === undefined
        ? null
        : toNumber(row.semantic_score),
    textScore:
      row.text_score === null || row.text_score === undefined
        ? null
        : toNumber(row.text_score),
    hybridScore: toNumber(row.hybrid_score),
    matchReason: row.match_reason,
  }
}

export async function aiSearchDirectoryWorksForWorkspace(
  workspaceOwnerId: string,
  input: DirectoryWorkAiSearchInput
): Promise<DirectoryWorkAiSearchResponse> {
  const query = input.query.trim().replace(/\s+/g, " ")
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50)
  const threshold =
    input.threshold ?? DIRECTORY_WORK_EMBEDDING_DEFAULT_THRESHOLD
  const queryEmbedding = await createEmbedding(query)

  const { data, error } = await supabase.rpc("hybrid_search_directory_works", {
    p_workspace_owner_id: workspaceOwnerId,
    p_q: query,
    p_query_embedding: vectorLiteral(queryEmbedding),
    p_category: input.category ?? null,
    p_subcategory: input.subcategory ?? null,
    p_unit: input.unit ?? null,
    p_limit: limit,
    p_threshold: threshold,
    p_model_name: DIRECTORY_WORK_EMBEDDING_MODEL,
    p_dimensions: DIRECTORY_WORK_EMBEDDING_DIMENSIONS,
  })

  if (error) throw error

  const rows = ((data ?? []) as HybridSearchRpcRow[]).map(mapHybridSearchRow)

  return {
    data: rows,
    meta: {
      limit,
      total: rows.length,
      modelName: DIRECTORY_WORK_EMBEDDING_MODEL,
      dimensions: DIRECTORY_WORK_EMBEDDING_DIMENSIONS,
      distanceOperator: DIRECTORY_WORK_EMBEDDING_DISTANCE_OPERATOR,
      threshold,
    },
  }
}
