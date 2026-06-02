import { useCallback } from "react"
import { useProjectEstimateContent } from "./use-project-estimate-content"
import type {
  ProjectEstimateOptionRow,
  ProjectEstimateMaterialOptionRow,
} from "@/types/project-estimate-content"

export type MoveDirection = "up" | "down"
const SORT_ORDER_STEP = 1000

function moveItem<T extends { id: string }>(
  items: T[],
  id: string,
  direction: MoveDirection
) {
  const index = items.findIndex((item) => item.id === id)
  const targetIndex = direction === "up" ? index - 1 : index + 1

  if (index < 0 || targetIndex < 0 || targetIndex >= items.length) return null

  const next = [...items]
  ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
  return next
}

function sortPayload<T extends { id: string }>(items: T[]) {
  return items.map((item, index) => ({
    id: item.id,
    sortOrder: (index + 1) * SORT_ORDER_STEP,
  }))
}

export function useEstimateEditorScenarios(projectId: string, recordId: string) {
  const contentState = useProjectEstimateContent(projectId, recordId)
  const { applyChange, getSections, content } = contentState

  const createSection = useCallback(
    async (title: string) => {
      const next = await applyChange({
        action: "create_section",
        payload: { title },
      })
      return next?.sections?.[0]?.id ?? null
    },
    [applyChange]
  )

  const ensureSection = useCallback(async () => {
    const sections = getSections()
    const existing = sections?.[0]?.id
    if (existing) return existing

    const createdId = await createSection("Без раздела")
    return createdId
  }, [getSections, createSection])

  const moveSection = useCallback(
    async (sectionId: string, direction: MoveDirection) => {
      if (!content) return
      const next = moveItem(content.sections, sectionId, direction)
      if (!next) return

      await applyChange({
        action: "reorder_sections",
        payload: { items: sortPayload(next) },
      })
    },
    [content, applyChange]
  )

  const moveWork = useCallback(
    async (sectionId: string, workId: string, direction: MoveDirection) => {
      if (!content) return
      const section = content.sections.find((item) => item.id === sectionId)
      if (!section) return
      const next = moveItem(section.works, workId, direction)
      if (!next) return

      await applyChange({
        action: "reorder_works",
        payload: { sectionId, items: sortPayload(next) },
      })
    },
    [content, applyChange]
  )

  const addDirectoryWork = useCallback(
    async (
      sectionId: string,
      selected: ProjectEstimateOptionRow,
      quantity?: number,
      price?: number
    ) => {
      await applyChange({
        action: "add_work_from_directory",
        payload: {
          sectionId,
          directoryWorkId: selected.id,
          quantity,
          price,
        },
      })
    },
    [applyChange]
  )

  const replaceDirectoryWork = useCallback(
    async (workId: string, selected: ProjectEstimateOptionRow) => {
      await applyChange({
        action: "update_work",
        payload: {
          workId,
          title: selected.title,
          price: selected.price,
        },
      })
    },
    [applyChange]
  )

  const addDirectoryMaterial = useCallback(
    async (
      workId: string,
      selected: ProjectEstimateMaterialOptionRow,
      quantity?: number,
      consumption?: number | null,
      price?: number,
      changedField?: "quantity" | "consumption" | "price"
    ) => {
      await applyChange({
        action: "add_material_from_directory",
        payload: {
          workId,
          directoryMaterialId: selected.id,
          quantity,
          consumption,
          price,
          changedField,
        },
      })
    },
    [applyChange]
  )

  const updateWork = useCallback(
    async (
      workId: string,
      payload: { title?: string; quantity?: number; price?: number }
    ) => {
      await applyChange({
        action: "update_work",
        payload: { workId, ...payload },
      })
    },
    [applyChange]
  )

  const updateMaterial = useCallback(
    async (
      materialId: string,
      payload: {
        title?: string
        quantity?: number
        consumption?: number | null
        price?: number
        changedField?: "quantity" | "consumption" | "price" | "workQuantity"
      }
    ) => {
      await applyChange({
        action: "update_material",
        payload: { materialId, ...payload },
      })
    },
    [applyChange]
  )

  const archiveSection = useCallback(
    async (sectionId: string) => {
      await applyChange({
        action: "archive_section",
        payload: { sectionId },
      })
    },
    [applyChange]
  )

  const archiveWork = useCallback(
    async (workId: string) => {
      await applyChange({
        action: "archive_work",
        payload: { workId },
      })
    },
    [applyChange]
  )

  const archiveMaterial = useCallback(
    async (materialId: string) => {
      await applyChange({
        action: "archive_material",
        payload: { materialId },
      })
    },
    [applyChange]
  )

  return {
    ...contentState,
    createSection,
    ensureSection,
    moveSection,
    moveWork,
    addDirectoryWork,
    replaceDirectoryWork,
    addDirectoryMaterial,
    updateWork,
    updateMaterial,
    archiveSection,
    archiveWork,
    archiveMaterial,
  }
}
