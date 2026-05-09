import { useMemo, useState } from "react"
import { estimateWorks } from "@/features/estimates/__mocks__/estimates"
import { getTotal } from "@/lib/calculations"
import type { Material, Work } from "@/types/estimate"

export function useEstimates() {
  const [workRows, setWorkRows] = useState(estimateWorks)
  const [expandedStages, setExpandedStages] = useState(true)
  const [expandedWorks, setExpandedWorks] = useState<Set<string>>(
    new Set([estimateWorks[0].id])
  )

  const totals = useMemo(() => {
    const workTotal = workRows.reduce(
      (sum, work) => sum + getTotal(work.quantity, work.price),
      0
    )
    const materialTotal = workRows.reduce(
      (sum, work) =>
        sum +
        work.materials.reduce(
          (materialsSum, material) =>
            materialsSum + getTotal(material.quantity, material.price),
          0
        ),
      0
    )

    return {
      materialTotal,
      workTotal,
    }
  }, [workRows])

  const toggleWork = (id: string) => {
    setExpandedWorks((current) => {
      const next = new Set(current)

      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }

      return next
    })
  }

  const updateWork = (id: string, updates: Partial<Work>) => {
    setWorkRows((current) =>
      current.map((work) => (work.id === id ? { ...work, ...updates } : work))
    )
  }

  const updateMaterial = (
    workId: string,
    materialId: string,
    updates: Partial<Material>
  ) => {
    setWorkRows((current) =>
      current.map((work) =>
        work.id === workId
          ? {
              ...work,
              materials: work.materials.map((material) =>
                material.id === materialId
                  ? { ...material, ...updates }
                  : material
              ),
            }
          : work
      )
    )
  }

  return {
    workRows,
    expandedStages,
    setExpandedStages,
    expandedWorks,
    totals,
    toggleWork,
    updateWork,
    updateMaterial,
  }
}
