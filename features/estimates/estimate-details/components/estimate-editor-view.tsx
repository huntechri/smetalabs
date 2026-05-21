"use client"

import * as React from "react"
import { useCallback, useDeferredValue, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  fetchProjectEstimateMaterialOptions,
  fetchProjectEstimateWorkCoefficient,
  fetchProjectEstimateWorkOptions,
  type EstimateContentChangeInput,
} from "@/features/estimates/api/project-estimate-content-client"
import { CreateSectionDialog } from "@/features/estimates/estimate-details/components/create-section-dialog"
import { EstimateEditorContext } from "@/features/estimates/estimate-details/components/estimate-editor-context"
import { EstimateEmptyState } from "@/features/estimates/estimate-details/components/estimate-empty-state"
import { EstimateMaterialPickerDialog } from "@/features/estimates/estimate-details/components/estimate-material-picker-dialog"
import { EstimateSectionCard } from "@/features/estimates/estimate-details/components/estimate-section-card"
import { EstimateWorkPickerDialog } from "@/features/estimates/estimate-details/components/estimate-work-picker-dialog"
import { parseDecimal, parseText } from "@/features/estimates/estimate-details/lib/estimate-editor-form"
import type {
  EstimateArchiveRequest,
  MaterialDialogState,
  WorkDialogState,
} from "@/features/estimates/estimate-details/types"
import { useProjectEstimateContent } from "@/features/estimates/hooks/use-project-estimate-content"
import { projectsQueryKeys } from "@/features/projects/api/projects-query-keys"
import type {
  ProjectEstimateContentSection,
  ProjectEstimateContentWork,
  ProjectEstimateMaterialOptionRow,
  ProjectEstimateOptionRow,
} from "@/types/project-estimate-content"

const EMPTY_WORK_DIALOG: WorkDialogState = {
  open: false,
  mode: "add",
  sectionId: null,
  work: null,
  selected: null,
}

const EMPTY_MATERIAL_DIALOG: MaterialDialogState = {
  open: false,
  work: null,
  selected: null,
}

const OPTION_SEARCH_MIN_LENGTH = 3
const WORK_COEFFICIENT_DIALOG_KEY = "work-coefficient"
const SORT_ORDER_STEP = 1000

type MoveDirection = "up" | "down"

function formatCoefficientInput(value: number) {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",")
}

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

export function EstimateEditorView({
  projectId,
  recordId,
}: {
  projectId: string
  recordId: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    content,
    loading,
    error,
    saving,
    savingIds,
    applyChange,
    applyWorkCoefficient,
    refetch,
    getSections,
  } = useProjectEstimateContent(projectId, recordId)
  const [sectionOpen, setSectionOpen] = React.useState(false)
  const [coefficientOpen, setCoefficientOpen] = React.useState(false)
  const [coefficientValue, setCoefficientValue] = React.useState("0")
  const [coefficientError, setCoefficientError] = React.useState<string | null>(null)
  const [workDialog, setWorkDialog] = React.useState<WorkDialogState>(EMPTY_WORK_DIALOG)
  const [materialDialog, setMaterialDialog] = React.useState<MaterialDialogState>(EMPTY_MATERIAL_DIALOG)
  const [archiveRequest, setArchiveRequest] = React.useState<EstimateArchiveRequest | null>(null)
  const [workSearch, setWorkSearch] = React.useState("")
  const [materialSearch, setMaterialSearch] = React.useState("")
  const ensuringRef = useRef(false)
  const ensurePendingRef = useRef<Promise<string | null> | null>(null)
  const coefficientTriggered = useRef(false)
  const workReplacingRef = useRef(false)

  const estimateSearch = searchParams.get("q")?.trim() ?? ""
  const searchActive = estimateSearch.length > 0
  const deferredSearch = useDeferredValue(estimateSearch)

  // Stabilise visibleSections: only recompute when content sections actually change
  const sectionsRef = useRef(content?.sections)
  const sectionsForMemo = React.useMemo(() => {
    const next = content?.sections ?? []
    const prev = sectionsRef.current
    // Shallow-comparison of section ids to avoid new array on every render
    if (
      prev &&
      prev.length === next.length &&
      prev.every((s: ProjectEstimateContentSection, i: number) => s === next[i])
    ) {
      return prev
    }
    sectionsRef.current = next
    return next
  }, [content?.sections])

  const visibleSections = React.useMemo(
    () => filterSections(sectionsForMemo, deferredSearch),
    [sectionsForMemo, deferredSearch]
  )

  const sectionIndexMap = React.useMemo(() => {
    const map = new Map<string, number>()
    sectionsForMemo.forEach((s: ProjectEstimateContentSection, i: number) =>
      map.set(s.id, i),
    )
    return map
  }, [sectionsForMemo])

  const workParams = React.useMemo(
    () => ({ q: workSearch, limit: 30, cursor: 0 }),
    [workSearch]
  )
  const materialParams = React.useMemo(
    () => ({ q: materialSearch, limit: 30, cursor: 0 }),
    [materialSearch]
  )

  const canSearchWorks = workSearch.trim().length >= OPTION_SEARCH_MIN_LENGTH
  const canSearchMaterials = materialSearch.trim().length >= OPTION_SEARCH_MIN_LENGTH

  const coefficientQuery = useQuery({
    queryKey: ["project-estimate-work-coefficient", projectId, recordId],
    queryFn: () => fetchProjectEstimateWorkCoefficient({ projectId, recordId }),
    enabled: coefficientOpen,
    staleTime: 0,
  })

  React.useEffect(() => {
    if (searchParams.get("dialog") !== WORK_COEFFICIENT_DIALOG_KEY) {
      coefficientTriggered.current = false
      return
    }
    if (coefficientTriggered.current) return
    coefficientTriggered.current = true

    setCoefficientOpen(true)
    const params = new URLSearchParams(searchParams.toString())
    params.delete("dialog")
    const nextSearch = params.toString()
    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname)
  }, [pathname, router, searchParams])

  React.useEffect(() => {
    if (!coefficientOpen) return
    const nextValue = coefficientQuery.data?.data.coefficientPercent
    if (nextValue === undefined) return
    setCoefficientValue(formatCoefficientInput(nextValue))
  }, [coefficientOpen, coefficientQuery.data?.data.coefficientPercent])

  const workOptions = useQuery({
    queryKey: projectsQueryKeys.estimateWorkOptions(projectId, recordId, workParams),
    queryFn: () =>
      fetchProjectEstimateWorkOptions({ projectId, recordId, params: workParams }),
    enabled: workDialog.open && canSearchWorks,
    staleTime: 30_000,
  })

  const materialOptions = useQuery({
    queryKey: projectsQueryKeys.estimateMaterialOptions(
      projectId,
      recordId,
      materialParams
    ),
    queryFn: () =>
      fetchProjectEstimateMaterialOptions({
        projectId,
        recordId,
        params: materialParams,
      }),
    enabled: materialDialog.open && canSearchMaterials,
    staleTime: 30_000,
  })

  const save = useCallback(
    async (input: EstimateContentChangeInput) => {
      const next = await applyChange(input)
      if (!next?.sections) return null
      return next
    },
    [applyChange]
  )

  const clearEstimateSearch = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("q")
    const nextSearch = params.toString()
    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname)
  }, [pathname, router, searchParams])

  const ensureSection = useCallback(async () => {
    const sections = getSections()
    const existing = sections?.[0]?.id
    if (existing) return existing

    if (ensuringRef.current && ensurePendingRef.current) {
      return ensurePendingRef.current
    }

    ensuringRef.current = true
    const promise = save({
      action: "create_section",
      payload: { title: "Без раздела" },
    })
      .then((next) => {
        const id = next?.sections?.[0]?.id ?? null
        ensuringRef.current = false
        ensurePendingRef.current = null
        return id
      })
      .catch(() => {
        ensuringRef.current = false
        ensurePendingRef.current = null
        return null
      })

    ensurePendingRef.current = promise
    return promise
  }, [getSections, save])

  const moveSection = useCallback(
    async (sectionId: string, direction: MoveDirection) => {
      if (!content || searchActive) return
      const next = moveItem(content.sections, sectionId, direction)
      if (!next) return

      await save({
        action: "reorder_sections",
        payload: { items: sortPayload(next) },
      })
    },
    [content, searchActive, save]
  )

  const moveWork = useCallback(
    async (sectionId: string, workId: string, direction: MoveDirection) => {
      if (!content || searchActive) return
      const section = content.sections.find((item: ProjectEstimateContentSection) => item.id === sectionId)
      if (!section) return
      const next = moveItem(section.works, workId, direction)
      if (!next) return

      await save({
        action: "reorder_works",
        payload: { sectionId, items: sortPayload(next) },
      })
    },
    [content, searchActive, save]
  )

  const moveMaterial = useCallback(
    async (workId: string, materialId: string, direction: MoveDirection) => {
      if (!content || searchActive) return
      const work = content.sections
        .flatMap((section: ProjectEstimateContentSection) => section.works)
        .find((item: ProjectEstimateContentWork) => item.id === workId)
      if (!work) return
      const next = moveItem(work.materials, materialId, direction)
      if (!next) return

      await save({
        action: "reorder_materials",
        payload: { workId, items: sortPayload(next) },
      })
    },
    [content, searchActive, save]
  )

  const openWorkDialog = useCallback(
    async (sectionId?: string) => {
      const target = sectionId ?? (await ensureSection())
      if (target) {
        setWorkSearch("")
        setWorkDialog({
          open: true,
          mode: "add",
          sectionId: target,
          work: null,
          selected: null,
        })
      }
    },
    [ensureSection]
  )

  const openReplaceWorkDialog = useCallback((work: ProjectEstimateContentWork) => {
    setWorkSearch("")
    setWorkDialog({
      open: true,
      mode: "replace",
      sectionId: work.sectionId,
      work,
      selected: null,
    })
  }, [])

  const openMaterialDialog = useCallback((work: ProjectEstimateContentWork) => {
    setMaterialDialog({ open: true, work, selected: null })
  }, [])

  const confirmArchive = useCallback(async () => {
    if (!archiveRequest) return
    await save(archiveRequest.input)
    setArchiveRequest(null)
  }, [archiveRequest, save])

  const createSection = useCallback(
    async (data: { name: string }) => {
      const title = parseText(data.name)
      if (!title) return

      await save({ action: "create_section", payload: { title } })
      setSectionOpen(false)
    },
    [save]
  )

  const applyCoefficient = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const parsed = Number(coefficientValue.trim().replace(",", "."))

      if (!Number.isFinite(parsed) || parsed < 0) {
        setCoefficientError("Введите коэффициент 0 или больше")
        return
      }

      setCoefficientError(null)

      try {
        await applyWorkCoefficient(parsed)
        await coefficientQuery.refetch()
        setCoefficientOpen(false)
      } catch (err) {
        setCoefficientError(
          err instanceof Error ? err.message : "Не удалось применить коэффициент"
        )
      }
    },
    [applyWorkCoefficient, coefficientQuery, coefficientValue]
  )

  const addDirectoryWork = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!workDialog.sectionId || !workDialog.selected) return

      const form = new FormData(event.currentTarget)
      await save({
        action: "add_work_from_directory",
        payload: {
          sectionId: workDialog.sectionId,
          directoryWorkId: workDialog.selected.id,
          quantity: parseDecimal(form.get("quantity"), 1),
          price: parseDecimal(form.get("price"), workDialog.selected.price),
        },
      })
      setWorkDialog(EMPTY_WORK_DIALOG)
    },
    [save, workDialog.sectionId, workDialog.selected]
  )

  const replaceDirectoryWork = useCallback(
    async (selected: ProjectEstimateOptionRow) => {
      if (!workDialog.work) return

      await save({
        action: "update_work",
        payload: {
          workId: workDialog.work.id,
          title: selected.title,
          price: selected.price,
        },
      })
      setWorkDialog(EMPTY_WORK_DIALOG)
    },
    [save, workDialog.work]
  )

  const addDirectoryMaterial = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!materialDialog.work || !materialDialog.selected) return

      const form = new FormData(event.currentTarget)
      const consumption = parseDecimal(form.get("consumption"), undefined) ?? null
      await save({
        action: "add_material_from_directory",
        payload: {
          workId: materialDialog.work.id,
          directoryMaterialId: materialDialog.selected.id,
          quantity: parseDecimal(form.get("quantity"), undefined),
          consumption,
          price: parseDecimal(form.get("price"), materialDialog.selected.price),
          changedField: consumption ? "consumption" : "quantity",
        },
      })
      setMaterialDialog(EMPTY_MATERIAL_DIALOG)
    },
    [save, materialDialog.work, materialDialog.selected]
  )

  const handleSectionOpenChange = useCallback((open: boolean) => {
    setSectionOpen(open)
  }, [])

  const handleCoefficientOpenChange = useCallback((open: boolean) => {
    setCoefficientOpen(open)
  }, [])

  const handleWorkPickerOpenChange = useCallback((open: boolean) => {
    if (!open) setWorkDialog(EMPTY_WORK_DIALOG)
  }, [])

  const handleMaterialPickerOpenChange = useCallback((open: boolean) => {
    if (!open) setMaterialDialog(EMPTY_MATERIAL_DIALOG)
  }, [])

  const handleArchiveOpenChange = useCallback((open: boolean) => {
    if (!open) setArchiveRequest(null)
  }, [])

  const handleWorkSelect = useCallback(
    (selected: ProjectEstimateOptionRow) => {
      setWorkDialog((current) => ({ ...current, selected }))
      if (workDialog.mode === "replace") {
        if (workReplacingRef.current) return
        workReplacingRef.current = true
        replaceDirectoryWork(selected)
          .catch((err) => {
            console.error("Replace work failed:", err)
          })
          .finally(() => {
            workReplacingRef.current = false
          })
      }
    },
    [workDialog.mode, replaceDirectoryWork]
  )

  const handleMaterialSelect = useCallback(
    (selected: ProjectEstimateMaterialOptionRow) =>
      setMaterialDialog((current) => ({ ...current, selected })),
    []
  )

  const contextValue = React.useMemo(
    () => ({
      savingIds,
      reorderDisabled: searchActive,
      onSave: save,
      onArchive: setArchiveRequest,
      onMoveSection: moveSection,
      onMoveWork: moveWork,
      onMoveMaterial: moveMaterial,
      onAddSection: () => setSectionOpen(true),
      onAddWork: openWorkDialog,
      onAddMaterial: openMaterialDialog,
      onReplaceWork: openReplaceWorkDialog,
    }),
    [
      savingIds,
      searchActive,
      save,
      moveSection,
      moveWork,
      moveMaterial,
      openWorkDialog,
      openMaterialDialog,
      openReplaceWorkDialog,
    ]
  )

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Загрузка сметы...</div>
  }

  if (error || !content) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error ?? "Не удалось загрузить смету"}
        </div>
        <Button className="w-fit" variant="outline" onClick={() => refetch()}>
          Повторить
        </Button>
      </div>
    )
  }

  return (
    <EstimateEditorContext.Provider value={contextValue}>
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-xl border bg-background p-1">
          {content.sections.length === 0 ? (
            <EstimateEmptyState onCreateClick={() => setSectionOpen(true)} />
          ) : visibleSections.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-4 text-center text-sm text-muted-foreground">
              <p>По смете ничего не найдено.</p>
              <Button size="sm" variant="outline" onClick={clearEstimateSearch}>
                Сбросить поиск
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {visibleSections.map((section) => (
                <EstimateSectionCard
                  key={section.id}
                  section={section}
                  sectionIndex={sectionIndexMap.get(section.id) ?? 0}
                  sectionsCount={content.sections.length}
                />
              ))}
            </div>
          )}
        </div>

        <CreateSectionDialog
          open={sectionOpen}
          onOpenChange={handleSectionOpenChange}
          onConfirm={createSection}
        />
        <EstimateWorkPickerDialog
          state={workDialog}
          query={workSearch}
          saving={saving}
          options={workOptions.data?.data ?? []}
          loading={workOptions.isLoading}
          onQueryChange={setWorkSearch}
          onOpenChange={handleWorkPickerOpenChange}
          onSelect={handleWorkSelect}
          onDirectorySubmit={addDirectoryWork}
        />
        <EstimateMaterialPickerDialog
          state={materialDialog}
          query={materialSearch}
          saving={saving}
          options={materialOptions.data?.data ?? []}
          loading={materialOptions.isLoading}
          onQueryChange={setMaterialSearch}
          onOpenChange={handleMaterialPickerOpenChange}
          onSelect={handleMaterialSelect}
          onDirectorySubmit={addDirectoryMaterial}
        />
        <Dialog open={coefficientOpen} onOpenChange={handleCoefficientOpenChange}>
          <DialogContent className="sm:max-w-sm">
            <form className="space-y-4" onSubmit={applyCoefficient}>
              <DialogHeader>
                <DialogTitle>Коэффициент работ</DialogTitle>
                <DialogDescription>
                  Коэффициент применяется только к работам. Цена округляется вверх до ближайших 10 ₽.
                </DialogDescription>
              </DialogHeader>
              <Input
                autoFocus
                disabled={coefficientQuery.isLoading}
                inputMode="decimal"
                onChange={(event) => setCoefficientValue(event.target.value)}
                placeholder="10"
                value={coefficientValue}
              />
              {coefficientError ? (
                <p className="text-sm text-destructive">{coefficientError}</p>
              ) : null}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCoefficientOpen(false)}
                >
                  Отмена
                </Button>
                <Button type="submit" disabled={saving || coefficientQuery.isLoading}>
                  Применить
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog
          open={archiveRequest !== null}
          onOpenChange={handleArchiveOpenChange}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{archiveRequest?.title}</DialogTitle>
              <DialogDescription>{archiveRequest?.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setArchiveRequest(null)}
              >
                Отмена
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={saving}
                onClick={confirmArchive}
              >
                Удалить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </EstimateEditorContext.Provider>
  )
}
