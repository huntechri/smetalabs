import { createHash } from "node:crypto"
import { supabase } from "@/db"
import { DirectoryMaterialsApiError } from "../api/directory-materials-errors"
import type { DirectoryMaterial } from "../types"

export const DIRECTORY_MATERIALS_AI_MODEL = "text-embedding-3-small"
export const DIRECTORY_MATERIALS_AI_DIMENSIONS = 1536
const DEFAULT_AI_SEARCH_LIMIT = 20
const DEFAULT_AI_SEARCH_THRESHOLD = 0.72
const DEFAULT_EMBEDDING_PROCESS_LIMIT = 20
const MAX_EMBEDDING_PROCESS_LIMIT = 50

type MaterialForEmbeddingDbRow = {
  id: string
  name: string
  unit_label: string
  unit_code: string
  price_amount: string | number
  currency_code: string
  category: string
  subcategory: string | null
  code: string | null
  supplier_name: string | null
  description: string | null
}

type MaterialAiSearchDbRow = MaterialForEmbeddingDbRow & {
  supplier_id: string | null
  image_url: string | null
  source_name: string | null
  source_external_row_key: string | null
  status: "active" | "archived"
  version: number
  created_at: string
  updated_at: string
  semantic_score: string | number
  text_score: string | number
  hybrid_score: string | number
  match_reason: string
}

type EmbeddingQueueDbRow = {
  id: string
  material_id: string
  embedding_input_text: string
  content_hash: string
}

function toNumber(value: string | number) {
  if (typeof value === "number") return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ")
}

function buildEmbeddingInputText(row: MaterialForEmbeddingDbRow) {
  return [
    `Материал: ${row.name}`,
    row.code ? `Код: ${row.code}` : null,
    `Категория: ${row.category}`,
    row.subcategory ? `Подкатегория: ${row.subcategory}` : null,
    `Единица: ${row.unit_label || row.unit_code}`,
    `Цена: ${toNumber(row.price_amount)} ${row.currency_code}`,
    row.supplier_name ? `Поставщик: ${row.supplier_name}` : null,
    row.description ? `Описание: ${row.description}` : null,
  ]
    .filter(Boolean)
    .map((part) => normalizeText(String(part)))
    .join("\n")
}

function buildContentHash(inputText: string) {
  return createHash("sha256")
    .update(`${DIRECTORY_MATERIALS_AI_MODEL}:${DIRECTORY_MATERIALS_AI_DIMENSIONS}:${inputText}`)
    .digest("hex")
}

function toVectorLiteral(values: number[]) {
  return `[${values.map((value) => Number(value).toFixed(8)).join(",")}]`
}

function mapAiSearchRow(row: MaterialAiSearchDbRow): DirectoryMaterial & {
  ai: {
    semanticScore: number
    textScore: number
    hybridScore: number
    matchReason: string
  }
} {
  const priceAmount = toNumber(row.price_amount)

  return {
    id: row.id,
    name: row.name,
    unit: row.unit_label || row.unit_code,
    unitCode: row.unit_code,
    unitLabel: row.unit_label,
    price: priceAmount,
    priceAmount,
    currencyCode: row.currency_code,
    category: row.category,
    subcategory: row.subcategory,
    code: row.code,
    supplierName: row.supplier_name,
    supplierId: row.supplier_id,
    imageUrl: row.image_url,
    description: row.description,
    status: row.status,
    version: row.version,
    metadata: {
      sourceName: row.source_name,
      sourceExternalRowKey: row.source_external_row_key,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      searchRank: toNumber(row.hybrid_score),
    },
    ai: {
      semanticScore: toNumber(row.semantic_score),
      textScore: toNumber(row.text_score),
      hybridScore: toNumber(row.hybrid_score),
      matchReason: row.match_reason,
    },
  }
}

async function createEmbedding(input: string) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new DirectoryMaterialsApiError(
      "BAD_REQUEST",
      "Ключ AI-провайдера не настроен на сервере",
      400
    )
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input, model: DIRECTORY_MATERIALS_AI_MODEL }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new DirectoryMaterialsApiError(
      "BAD_REQUEST",
      text || "AI-провайдер не смог подготовить данные материала",
      400
    )
  }

  const json = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>
  }
  const embedding = json.data?.[0]?.embedding

  if (!embedding || embedding.length !== DIRECTORY_MATERIALS_AI_DIMENSIONS) {
    throw new DirectoryMaterialsApiError(
      "BAD_REQUEST",
      "AI-провайдер вернул некорректный размер данных",
      400
    )
  }

  return embedding
}

export async function enqueueDirectoryMaterialEmbeddingForWorkspace(
  workspaceOwnerId: string,
  materialId: string
) {
  const { data, error } = await supabase
    .from("directory_materials")
    .select("id,name,unit_label,unit_code,price_amount,currency_code,category,subcategory,code,supplier_name,description")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", materialId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle()

  if (error) throw error
  if (!data) return

  const inputText = buildEmbeddingInputText(data as MaterialForEmbeddingDbRow)
  const contentHash = buildContentHash(inputText)

  const { error: upsertError } = await supabase
    .from("directory_material_embeddings")
    .upsert(
      {
        workspace_owner_id: workspaceOwnerId,
        material_id: materialId,
        model_name: DIRECTORY_MATERIALS_AI_MODEL,
        dimensions: DIRECTORY_MATERIALS_AI_DIMENSIONS,
        content_hash: contentHash,
        embedding_input_text: inputText,
        status: "pending",
        last_error: null,
      },
      {
        onConflict: "workspace_owner_id,material_id,model_name,content_hash",
      }
    )

  if (upsertError) throw upsertError

  await supabase
    .from("directory_material_embeddings")
    .update({ status: "stale" })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("material_id", materialId)
    .eq("model_name", DIRECTORY_MATERIALS_AI_MODEL)
    .neq("content_hash", contentHash)
    .in("status", ["pending", "ready", "failed"])
}

export async function enqueueAllDirectoryMaterialEmbeddingsForWorkspace(
  workspaceOwnerId: string,
  limit = DEFAULT_EMBEDDING_PROCESS_LIMIT
) {
  const safeLimit = Math.max(1, Math.min(limit, MAX_EMBEDDING_PROCESS_LIMIT))
  const { data, error } = await supabase
    .from("directory_materials")
    .select("id")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(safeLimit)

  if (error) throw error

  for (const row of (data ?? []) as Array<{ id: string }>) {
    await enqueueDirectoryMaterialEmbeddingForWorkspace(workspaceOwnerId, row.id)
  }
}

export async function processDirectoryMaterialEmbeddingsForWorkspace(
  workspaceOwnerId: string,
  limit = DEFAULT_EMBEDDING_PROCESS_LIMIT
) {
  const safeLimit = Math.max(1, Math.min(limit, MAX_EMBEDDING_PROCESS_LIMIT))
  await enqueueAllDirectoryMaterialEmbeddingsForWorkspace(workspaceOwnerId, safeLimit)

  const { data, error } = await supabase
    .from("directory_material_embeddings")
    .select("id,material_id,embedding_input_text,content_hash")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("model_name", DIRECTORY_MATERIALS_AI_MODEL)
    .eq("dimensions", DIRECTORY_MATERIALS_AI_DIMENSIONS)
    .in("status", ["pending", "failed"])
    .order("updated_at", { ascending: true })
    .limit(safeLimit)

  if (error) throw error

  let processed = 0
  let failed = 0

  for (const row of (data ?? []) as EmbeddingQueueDbRow[]) {
    try {
      const embedding = await createEmbedding(row.embedding_input_text)
      const { error: updateError } = await supabase
        .from("directory_material_embeddings")
        .update({
          embedding: toVectorLiteral(embedding),
          status: "ready",
          generated_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("workspace_owner_id", workspaceOwnerId)
        .eq("id", row.id)

      if (updateError) throw updateError
      processed += 1
    } catch (err) {
      failed += 1
      await supabase
        .from("directory_material_embeddings")
        .update({
          status: "failed",
          last_error: err instanceof Error ? err.message : "Не удалось подготовить материал для AI-поиска",
        })
        .eq("workspace_owner_id", workspaceOwnerId)
        .eq("id", row.id)
    }
  }

  return {
    data: {
      processed,
      failed,
      skipped: Math.max(0, safeLimit - processed - failed),
      modelName: DIRECTORY_MATERIALS_AI_MODEL,
      dimensions: DIRECTORY_MATERIALS_AI_DIMENSIONS,
    },
  }
}

export async function searchDirectoryMaterialsAiForWorkspace(
  workspaceOwnerId: string,
  input: {
    query: string
    category?: string | null
    subcategory?: string | null
    unit?: string | null
    limit?: number
    threshold?: number
  }
) {
  const query = normalizeText(input.query)
  const limit = Math.max(1, Math.min(input.limit ?? DEFAULT_AI_SEARCH_LIMIT, 50))
  const threshold = Math.min(Math.max(input.threshold ?? DEFAULT_AI_SEARCH_THRESHOLD, 0), 1)
  const embedding = await createEmbedding(query)

  const { data, error } = await supabase.rpc("search_directory_materials_ai", {
    p_workspace_owner_id: workspaceOwnerId,
    p_query: query,
    p_query_embedding: toVectorLiteral(embedding),
    p_category: input.category || null,
    p_subcategory: input.subcategory || null,
    p_unit: input.unit || null,
    p_limit: limit,
    p_threshold: threshold,
  })

  if (error) throw error

  return {
    data: ((data ?? []) as MaterialAiSearchDbRow[]).map(mapAiSearchRow),
    meta: {
      query,
      limit,
      threshold,
      modelName: DIRECTORY_MATERIALS_AI_MODEL,
      dimensions: DIRECTORY_MATERIALS_AI_DIMENSIONS,
    },
  }
}
