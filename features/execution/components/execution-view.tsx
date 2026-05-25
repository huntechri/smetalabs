"use client"

import * as React from "react"
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useProjectEstimateContent } from "@/features/estimates/hooks/use-project-estimate-content"
import { ExecutionSectionCard } from "@/features/execution/execution-details/components/execution-section-card"
import { CreateWorkDialog } from "@/features/execution/execution-details/components/create-work-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  ProjectEstimateContentSection,
  ProjectEstimateContentWork,
} from "@/types/project-estimate-content"
import { toast } from "sonner"

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

function filterSections(
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
      return []
    })

    return works.length ? [{ ...section, works }] : []
  })
}

const EMPTY_SECTIONS: ProjectEstimateContentSection[] = []

export function ExecutionView({
  projectId,
  estimateId,
}: {
  projectId: string
  estimateId: string
}) {
  const searchParams = useSearchParams()
  const [createWorkOpen, setCreateWorkOpen] = useState(false)

  const {
    content,
    loading,
    loadError,
    mutationError,
    saving,
    applyChange,
    refetch,
  } = useProjectEstimateContent(projectId, estimateId)

  const executionSearch = searchParams.get("q")?.trim() ?? ""
  const deferredSearch = useDeferredValue(executionSearch)

  const nextSections = content?.sections ?? EMPTY_SECTIONS
  const [sectionsForMemo, setSectionsForMemo] = useState(nextSections)
  const [prevSections, setPrevSections] = useState(nextSections)

  if (nextSections !== prevSections) {
    setPrevSections(nextSections)
    const isSame =
      nextSections.length === sectionsForMemo.length &&
      nextSections.every((s, i) => s === sectionsForMemo[i])
    if (!isSame) {
      setSectionsForMemo(nextSections)
    }
  }

  const visibleSections = useMemo(
    () => filterSections(sectionsForMemo, deferredSearch),
    [sectionsForMemo, deferredSearch]
  )

  const handleUpdateWork = useCallback(
    async (id: string, updates: { factQuantity?: number; factPrice?: number }) => {
      try {
        await applyChange({
          action: "update_work",
          payload: {
            workId: id,
            factQuantity: updates.factQuantity,
            factPrice: updates.factPrice,
          },
        })
      } catch (err) {
        console.error("Failed to update work fact:", err)
        toast.error("Не удалось обновить фактические показатели")
      }
    },
    [applyChange]
  )

  // Listen to toolbar extra work event
  useEffect(() => {
    const handleAddWork = () => {
      setCreateWorkOpen(true)
    }
    window.addEventListener("project-execution:add-work", handleAddWork)
    return () => {
      window.removeEventListener("project-execution:add-work", handleAddWork)
    }
  }, [])

  // Listen to toolbar export event
  useEffect(() => {
    const handleExport = async () => {
      if (content?.record && content?.sections) {
        const hasAnyFact = content.sections.some((s) =>
          s.works.some((w) => (w.factQuantity ?? 0) !== 0)
        )
        if (!hasAnyFact) {
          toast.error("Нет работ с фактическим выполнением для экспорта")
          return
        }
        const { exportExecutionToExcel } = await import(
          "@/features/execution/lib/execution-excel-exporter"
        )
        await exportExecutionToExcel({
          record: content.record,
          sections: content.sections,
        })
      }
    }
    window.addEventListener("project-execution:export", handleExport)
    return () => {
      window.removeEventListener("project-execution:export", handleExport)
    }
  }, [content])

  const ensureSection = useCallback(async () => {
    const existing = content?.sections?.[0]?.id
    if (existing) return existing

    try {
      const next = await applyChange({
        action: "create_section",
        payload: { title: "Без раздела" },
      })
      return next?.sections?.[0]?.id ?? null
    } catch (err) {
      console.error("Failed to ensure section:", err)
      return null
    }
  }, [content?.sections, applyChange])

  const handleCreateWorkConfirm = useCallback(
    async (data: {
      title: string
      unit: string
      quantity: number
      price: number
    }) => {
      const sectionId = await ensureSection()
      if (!sectionId) {
        toast.error("Не удалось создать раздел для работы")
        return
      }

      const unitCode = data.unit.trim().toLowerCase().replace(/\s+/g, "_")

      try {
        await applyChange({
          action: "add_manual_work",
          payload: {
            sectionId,
            title: data.title,
            unitLabel: data.unit,
            unitCode,
            quantity: data.quantity,
            price: data.price,
            category: "Дополнительные работы",
          },
        })
        toast.success("Работа добавлена")
      } catch (err) {
        console.error("Failed to add manual work:", err)
        toast.error("Не удалось добавить работу")
      }
    },
    [ensureSection, applyChange]
  )

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!content) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Alert variant="destructive">
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>
            {loadError ?? "Не удалось загрузить данные исполнения"}
          </AlertDescription>
        </Alert>
        <Button className="w-fit" variant="outline" onClick={() => refetch()}>
          Повторить
        </Button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {mutationError && (
        <Alert variant="destructive" className="mx-1 mb-3">
          <AlertTitle>Ошибка сохранения</AlertTitle>
          <AlertDescription>{mutationError}</AlertDescription>
        </Alert>
      )}
      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-lg border bg-background p-1">
        {content.sections.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-4 text-center text-xs text-muted-foreground">
            <p>В смете пока нет разделов и работ.</p>
            <Button size="sm" variant="outline" onClick={() => setCreateWorkOpen(true)}>
              Добавить работу
            </Button>
          </div>
        ) : visibleSections.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-4 text-center text-xs text-muted-foreground">
            <p>Ничего не найдено.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {visibleSections.map((section) => (
              <ExecutionSectionCard
                key={section.id}
                section={section}
                onUpdate={handleUpdateWork}
              />
            ))}
          </div>
        )}
      </div>

      <CreateWorkDialog
        open={createWorkOpen}
        onOpenChange={setCreateWorkOpen}
        onConfirm={handleCreateWorkConfirm}
      />
    </div>
  )
}
