"use client"

import { parseCsvFileInBatches } from "@/features/directories/application/csv-parser"
import {
  DIRECTORY_MATERIAL_IMPORT_APPLY_BATCH_SIZE,
  DIRECTORY_MATERIAL_IMPORT_BATCH_SIZE,
  DIRECTORY_MATERIAL_IMPORT_HEADER_ALIASES,
  getDirectoryMaterialImportAppliedMessage,
  getDirectoryMaterialImportBatchProgressMessage,
  getDirectoryMaterialImportCompletedMessage,
  getDirectoryMaterialImportProgressMessage,
} from "../model/directory-materials-import-model"
import type {
  DirectoryMaterialImportApplyInput,
  DirectoryMaterialImportApplyResponse,
  DirectoryMaterialImportBatchInput,
  DirectoryMaterialImportCreateInput,
  DirectoryMaterialImportPreviewResponse,
} from "../types"

type PreviewData = DirectoryMaterialImportPreviewResponse["data"]

export async function createDirectoryMaterialImportPreview(params: {
  file: File
  sourceName: string
  createJob: (input: DirectoryMaterialImportCreateInput) => Promise<PreviewData>
  appendBatch: (
    id: string,
    input: DirectoryMaterialImportBatchInput
  ) => Promise<PreviewData>
  setPreview: (preview: PreviewData) => void
  setProgress: (message: string) => void
}) {
  params.setProgress("Создаём импорт...")

  const jobData = await params.createJob({
    rows: [],
    fileName: params.file.name,
    fileMimeType: params.file.type || "text/csv",
    fileSizeBytes: params.file.size,
    sourceName: params.sourceName.trim() || null,
    options: { batchSize: DIRECTORY_MATERIAL_IMPORT_BATCH_SIZE },
  })

  let latestPreview = jobData
  let pendingBatch: Awaited<
    ReturnType<typeof parseCsvFileInBatches>
  > extends AsyncGenerator<infer Batch>
    ? Batch | null
    : never = null

  for await (const batch of parseCsvFileInBatches({
    file: params.file,
    headerAliases: DIRECTORY_MATERIAL_IMPORT_HEADER_ALIASES,
    batchSize: DIRECTORY_MATERIAL_IMPORT_BATCH_SIZE,
    onProgress: ({ rowsRead, batchesRead }) =>
      params.setProgress(
        getDirectoryMaterialImportProgressMessage({ rowsRead, batchesRead })
      ),
  })) {
    if (pendingBatch) {
      latestPreview = await params.appendBatch(jobData.job.id, {
        ...pendingBatch,
        isLastBatch: false,
      })
      params.setPreview(latestPreview)
      params.setProgress(
        getDirectoryMaterialImportBatchProgressMessage({
          totalRows: latestPreview.job.totalRows,
          batchNumber: pendingBatch.batchNumber,
        })
      )
    }
    pendingBatch = batch
  }

  if (!pendingBatch) {
    params.setProgress("")
    throw new Error("Файл не содержит строк для импорта")
  }

  latestPreview = await params.appendBatch(jobData.job.id, {
    ...pendingBatch,
    isLastBatch: true,
  })
  params.setPreview(latestPreview)
  params.setProgress(
    getDirectoryMaterialImportCompletedMessage(latestPreview.job.totalRows)
  )

  return latestPreview
}

export async function applyDirectoryMaterialImportPreview(params: {
  preview: PreviewData
  applyJob: (
    id: string,
    input?: DirectoryMaterialImportApplyInput
  ) => Promise<DirectoryMaterialImportApplyResponse["data"]>
  setProgress: (message: string) => void
}) {
  let hasMore = true

  while (hasMore) {
    const response = await params.applyJob(params.preview.job.id, {
      batchSize: DIRECTORY_MATERIAL_IMPORT_APPLY_BATCH_SIZE,
    })
    hasMore = Boolean(response.hasMore)
    params.setProgress(
      getDirectoryMaterialImportAppliedMessage(response.job.appliedRows)
    )
  }
}
