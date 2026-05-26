import type { ProjectEstimateContentSection } from "@/types/project-estimate-content"

const SORT_ORDER_STEP = 1000

export type MoveDirection = "up" | "down"

function normalizeSearchText(value: unknown) {
  return String(value ?? "")
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim()
}

function searchWords(query: string) {
  return normalizeSearchText(query).split(" ").filter(Boolean)
}

function includesWords(words: string[], values: unknown[]) {
  if (!words.length) return true
  const target = normalizeSearchText(values.join(" "))
  return words.every((word) => target.includes(word))
}

export function filterEstimateSections(
  sections: ProjectEstimateContentSection[],
  query: string
): ProjectEstimateContentSection[] {
  const words = searchWords(query)
  if (!words.length) return sections

  return sections.flatMap((section) => {
    const sectionFound = includesWords(words, [
      section.number,
      section.title,
      section.worksAmount,
      section.materialsAmount,
      section.totalAmount,
    ])

    if (sectionFound) return [section]

    const works = section.works.flatMap((work) => {
      const workFound = includesWords(words, [
        work.number,
        work.code,
        work.title,
        work.unitCode,
        work.unitLabel,
        work.quantity,
        work.price,
        work.category,
        work.notes,
      ])

      if (workFound) return [work]

      const materials = work.materials.filter((material) =>
        includesWords(words, [
          material.number,
          material.code,
          material.title,
          material.unitCode,
          material.unitLabel,
          material.quantity,
          material.consumption,
          material.price,
          material.supplierName,
          material.notes,
        ])
      )

      return materials.length ? [{ ...work, materials }] : []
    })

    return works.length ? [{ ...section, works }] : []
  })
}

export function moveItem<T extends { id: string }>(
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

export function buildSortPayload<T extends { id: string }>(items: T[]) {
  return items.map((item, index) => ({
    id: item.id,
    sortOrder: (index + 1) * SORT_ORDER_STEP,
  }))
}
