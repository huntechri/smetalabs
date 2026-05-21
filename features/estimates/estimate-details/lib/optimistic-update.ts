import type {
  ProjectEstimateContentMaterial,
  ProjectEstimateContentResponse,
  ProjectEstimateContentSection,
  ProjectEstimateContentWork,
} from "@/types/project-estimate-content"
import type { EstimateContentChangeInput } from "@/features/estimates/api/project-estimate-content-client"

/** Inner data shape of ProjectEstimateContentResponse */
export type ProjectEstimateContentData = ProjectEstimateContentResponse["data"]

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000
}

function resolveMaterialQuantity(params: {
  workQuantity: number
  currentQuantity: number
  currentConsumption: number | null
  quantity?: number
  consumption?: number | null
  changedField?: "quantity" | "consumption" | "price" | "workQuantity"
}): { quantity: number; consumption: number | null } {
  const changedField = params.changedField ?? "quantity"
  const nextConsumption =
    params.consumption !== undefined ? params.consumption : params.currentConsumption
  const inputQuantity = params.quantity !== undefined ? params.quantity : params.currentQuantity

  if (
    (changedField === "consumption" || changedField === "workQuantity") &&
    nextConsumption !== null
  ) {
    return {
      quantity: roundQuantity(params.workQuantity / nextConsumption),
      consumption: nextConsumption,
    }
  }

  if (changedField === "quantity") {
    return {
      quantity: roundQuantity(inputQuantity),
      consumption: inputQuantity > 0 ? roundQuantity(params.workQuantity / inputQuantity) : null,
    }
  }

  return {
    quantity: roundQuantity(inputQuantity),
    consumption: nextConsumption,
  }
}

function recalcSection(section: ProjectEstimateContentSection): ProjectEstimateContentSection {
  const worksAmount = roundMoney(section.works.reduce((sum, w) => sum + w.totalAmount, 0))
  const materialsAmount = roundMoney(
    section.works.reduce((sum, w) => sum + w.materialsAmount, 0)
  )
  const totalAmount = roundMoney(worksAmount + materialsAmount)

  return { ...section, worksAmount, materialsAmount, totalAmount }
}

function recalcSummary(
  sections: ProjectEstimateContentSection[]
): ProjectEstimateContentData["summary"] {
  return sections.reduce(
    (acc, s) => ({
      worksAmount: roundMoney(acc.worksAmount + s.worksAmount),
      materialsAmount: roundMoney(acc.materialsAmount + s.materialsAmount),
      totalAmount: roundMoney(acc.totalAmount + s.totalAmount),
    }),
    { worksAmount: 0, materialsAmount: 0, totalAmount: 0 }
  )
}

function recalcRecordAmount(sections: ProjectEstimateContentSection[]): number {
  return roundMoney(sections.reduce((sum, s) => sum + s.totalAmount, 0))
}

// ─── update_work ────────────────────────────────────────────────

function applyUpdateWork(
  data: ProjectEstimateContentData,
  input: Extract<EstimateContentChangeInput, { action: "update_work" }>
): ProjectEstimateContentData | null {
  const { workId, quantity, price, sectionId } = input.payload

  // Section move combined with quantity/price is too complex for optimistic update
  if (sectionId !== undefined) return null

  // Only optimistically handle quantity and/or price changes
  if (quantity === undefined && price === undefined) return null

  // Find the work and its parent section
  let foundSection: ProjectEstimateContentSection | null = null
  let foundWork: ProjectEstimateContentWork | null = null

  for (const section of data.sections) {
    const work = section.works.find((w) => w.id === workId)
    if (work) {
      foundSection = section
      foundWork = work
      break
    }
  }

  if (!foundWork || !foundSection) return null

  const newQuantity = quantity !== undefined ? quantity : foundWork.quantity
  const newPrice = price !== undefined ? price : foundWork.price
  const newTotalAmount = roundMoney(newQuantity * newPrice)

  // Recalculate materials whose consumption > 0
  const updatedMaterials: ProjectEstimateContentMaterial[] = foundWork.materials.map((m) => {
    if (m.consumption !== null && m.consumption > 0) {
      const newMatQuantity = roundQuantity(newQuantity / m.consumption)
      const newMatTotalAmount = roundMoney(newMatQuantity * m.price)
      return { ...m, quantity: newMatQuantity, totalAmount: newMatTotalAmount }
    }
    return m
  })

  const newMaterialsAmount = roundMoney(
    updatedMaterials.reduce((sum, m) => sum + m.totalAmount, 0)
  )
  const newTotalWithMaterialsAmount = roundMoney(newTotalAmount + newMaterialsAmount)

  const updatedWork: ProjectEstimateContentWork = {
    ...foundWork,
    quantity: newQuantity,
    price: newPrice,
    totalAmount: newTotalAmount,
    materialsAmount: newMaterialsAmount,
    totalWithMaterialsAmount: newTotalWithMaterialsAmount,
    materials: updatedMaterials,
  }

  // Rebuild sections list with updated work → recalc aggregates
  const updatedSections = data.sections.map((section) => {
    if (section.id !== foundSection!.id) return section

    const updatedWorks = section.works.map((w) => (w.id === workId ? updatedWork : w))
    return recalcSection({ ...section, works: updatedWorks })
  })

  return {
    ...data,
    sections: updatedSections,
    summary: recalcSummary(updatedSections),
    record: { ...data.record, amount: recalcRecordAmount(updatedSections) },
  }
}

// ─── update_material ────────────────────────────────────────────

function applyUpdateMaterial(
  data: ProjectEstimateContentData,
  input: Extract<EstimateContentChangeInput, { action: "update_material" }>
): ProjectEstimateContentData | null {
  const { materialId, quantity, consumption, price, changedField } = input.payload

  // Find material, its work, and section
  let foundSection: ProjectEstimateContentSection | null = null
  let foundWork: ProjectEstimateContentWork | null = null
  let foundMaterial: ProjectEstimateContentMaterial | null = null

  for (const section of data.sections) {
    for (const work of section.works) {
      const material = work.materials.find((m) => m.id === materialId)
      if (material) {
        foundSection = section
        foundWork = work
        foundMaterial = material
        break
      }
    }
    if (foundMaterial) break
  }

  if (!foundMaterial || !foundWork || !foundSection) return null

  const resolved = resolveMaterialQuantity({
    workQuantity: foundWork.quantity,
    currentQuantity: foundMaterial.quantity,
    currentConsumption: foundMaterial.consumption,
    quantity,
    consumption,
    changedField,
  })

  const newPrice = price !== undefined ? price : foundMaterial.price

  const updatedMaterial: ProjectEstimateContentMaterial = {
    ...foundMaterial,
    quantity: resolved.quantity,
    consumption: resolved.consumption,
    price: newPrice,
    totalAmount: roundMoney(resolved.quantity * newPrice),
  }

  const updatedMaterials = foundWork.materials.map((m) =>
    m.id === materialId ? updatedMaterial : m
  )

  const newMaterialsAmount = roundMoney(
    updatedMaterials.reduce((sum, m) => sum + m.totalAmount, 0)
  )
  const newTotalWithMaterialsAmount = roundMoney(
    foundWork.totalAmount + newMaterialsAmount
  )

  const updatedWork: ProjectEstimateContentWork = {
    ...foundWork,
    materialsAmount: newMaterialsAmount,
    totalWithMaterialsAmount: newTotalWithMaterialsAmount,
    materials: updatedMaterials,
  }

  const updatedSections = data.sections.map((section) => {
    if (section.id !== foundSection!.id) return section

    const updatedWorks = section.works.map((w) =>
      w.id === foundWork!.id ? updatedWork : w
    )
    return recalcSection({ ...section, works: updatedWorks })
  })

  return {
    ...data,
    sections: updatedSections,
    summary: recalcSummary(updatedSections),
    record: { ...data.record, amount: recalcRecordAmount(updatedSections) },
  }
}

// ─── public API ─────────────────────────────────────────────────

/**
 * Optimistically apply a content change to the cached estimate data.
 * Returns the updated data, or null if the change type is not supported
 * (caller should fall back to full server round-trip).
 *
 * Supported actions:
 * - update_work (quantity/price only, no section move)
 * - update_material
 */
export function applyOptimisticChange(
  data: ProjectEstimateContentData | undefined,
  input: EstimateContentChangeInput
): ProjectEstimateContentData | null {
  if (!data) return null

  switch (input.action) {
    case "update_work":
      return applyUpdateWork(data, input)

    case "update_material":
      return applyUpdateMaterial(data, input)

    default:
      return null
  }
}
