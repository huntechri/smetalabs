import type { ProjectEstimateContentSection } from "@/types/project-estimate-content"

export const SORT_ORDER_STEP = 1000

export type MoveDirection = "up" | "down"

export function normalizeSearchText(value: unknown) {
  return String(value ?? "")
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim()
}

export function searchWords(query: string) {
  return normalizeSearchText(query).split(" ").filter(Boolean)
}

export function includesWords(words: string[], values: unknown[]) {
  if (!words.length) return true
  const target = normalizeSearchText(values.join(" "))
  return words.every((word) => target.includes(word))
}

export function filterSections(
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

      const materials = work.materials.filter((m) =>
        includesWords(words, [
          m.number,
          m.code,
          m.title,
          m.unitCode,
          m.unitLabel,
          m.quantity,
          m.price,

          m.notes,
        ])
      )

      if (materials.length > 0) {
        return [{ ...work, materials }]
      }
      return []
    })

    if (works.length > 0) {
      return [{ ...section, works }]
    }
    return []
  })
}

export function moveItem<T extends { id: string }>(
  items: T[],
  id: string,
  direction: MoveDirection
) {
  const index = items.findIndex((item) => item.id === id)
  if (index === -1) return items
  if (direction === "up" && index === 0) return items
  if (direction === "down" && index === items.length - 1) return items

  const result = [...items]
  const targetIndex = direction === "up" ? index - 1 : index + 1
  const item = result[index]!
  result[index] = result[targetIndex]!
  result[targetIndex] = item
  return result
}

export function sortPayload<T extends { id: string }>(items: T[]) {
  return items.map((item, index) => ({
    id: item.id,
    sortOrder: (index + 1) * SORT_ORDER_STEP,
  }))
}
