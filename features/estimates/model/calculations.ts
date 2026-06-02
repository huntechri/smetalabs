import type {
  ProjectEstimateContentSection,
  ProjectEstimateContentSummary,
} from "@/types/project-estimate-content"

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function roundQuantity(value: number): number {
  return Math.ceil(value)
}

export function roundConsumption(value: number): number {
  return Math.round(value * 1000000) / 1000000
}

export function calculateMaterialAmount(quantity: number, price: number): number {
  return roundMoney(quantity * price)
}

export function calculateWorkAmount(quantity: number, price: number): number {
  return roundMoney(quantity * price)
}

export function calculateWorkFactAmount(factQuantity: number, factPrice: number): number {
  return roundMoney(factQuantity * factPrice)
}

export function calculateWorkTotalWithMaterials(totalAmount: number, materialsAmount: number): number {
  return roundMoney(totalAmount + materialsAmount)
}

export function calculateWorkPriceWithCoefficient(basePrice: number, coefficientPercent: number): number {
  if (coefficientPercent <= 0) {
    return roundMoney(basePrice)
  }
  const rawPrice = basePrice * (1 + coefficientPercent / 100)
  return Math.ceil(rawPrice / 10) * 10
}

export function resolveMaterialQuantity(params: {
  workQuantity: number
  currentQuantity: number
  currentConsumption: number | null
  quantity?: number
  consumption?: number | null
  changedField?: "quantity" | "consumption" | "price" | "workQuantity"
}): { quantity: number; consumption: number | null } {
  const changedField = params.changedField ?? "quantity"
  const nextConsumption =
    params.consumption !== undefined
      ? params.consumption
      : params.currentConsumption
  const inputQuantity =
    params.quantity !== undefined ? params.quantity : params.currentQuantity

  if (
    (changedField === "consumption" || changedField === "workQuantity") &&
    nextConsumption !== null
  ) {
    return {
      quantity: roundQuantity(params.workQuantity * nextConsumption),
      consumption: nextConsumption,
    }
  }

  if (changedField === "quantity") {
    const resolvedQty = roundQuantity(inputQuantity)
    return {
      quantity: resolvedQty,
      consumption:
        params.workQuantity > 0
          ? roundConsumption(resolvedQty / params.workQuantity)
          : null,
    }
  }

  return {
    quantity: roundQuantity(inputQuantity),
    consumption: nextConsumption,
  }
}

export function recalcSection(
  section: ProjectEstimateContentSection
): ProjectEstimateContentSection {
  const worksAmount = roundMoney(
    section.works.reduce((sum, w) => sum + w.totalAmount, 0)
  )
  const materialsAmount = roundMoney(
    section.works.reduce((sum, w) => sum + w.materialsAmount, 0)
  )
  const totalAmount = roundMoney(worksAmount + materialsAmount)

  return { ...section, worksAmount, materialsAmount, totalAmount }
}

export function recalcSummary(
  sections: ProjectEstimateContentSection[]
): ProjectEstimateContentSummary {
  return sections.reduce(
    (acc, s) => ({
      worksAmount: roundMoney(acc.worksAmount + s.worksAmount),
      materialsAmount: roundMoney(acc.materialsAmount + s.materialsAmount),
      totalAmount: roundMoney(acc.totalAmount + s.totalAmount),
    }),
    { worksAmount: 0, materialsAmount: 0, totalAmount: 0 }
  )
}

export function recalcRecordAmount(sections: ProjectEstimateContentSection[]): number {
  return roundMoney(sections.reduce((sum, s) => sum + s.totalAmount, 0))
}
