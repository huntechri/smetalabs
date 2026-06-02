"use client"

import * as React from "react"
import { useCallback, useDeferredValue, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  fetchProjectEstimateMaterialOptions,
  fetchProjectEstimateWorkOptions,
} from "@/features/estimates/api/project-estimate-content-client"
import { EstimateWorkCoefficientDialog } from "./estimate-work-coefficient-dialog"
import { EstimateImportDialog } from "./estimate-import-dialog"
import { exportEstimateToExcel } from "@/features/estimates/application/estimate-excel-exporter"
import { CreateSectionDialog } from "./create-section-dialog"
import { EstimateEditorContext } from "./estimate-editor-context"
import { EstimateEmptyState } from "./estimate-empty-state"
import { EstimateMaterialPickerDialog } from "./estimate-material-picker-dialog"
import { EstimateSectionCard } from "./estimate-section-card"
import { EstimateWorkPickerDialog } from "./estimate-work-picker-dialog"
import { parseText } from "@/features/estimates/model/estimate-editor-form"
import type {
  EstimateArchiveRequest,
  MaterialDialogState,
  WorkDialogState,
} from "./types"
import { useEstimateEditorScenarios } from "@/features/estimates/application/use-estimate-editor-scenarios"
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

const EMPTY_SECTIONS: ProjectEstimateContentSection[] = []

const OPTION_SEARCH_MIN_LENGTH = 3
const WORK_COEFFICIENT_DIALOG_KEY = "work-coefficient"



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
  const scenarios = useEstimateEditorScenarios(projectId, recordId)
  const {
    content,
    loading,
    loadError,
    mutationError,
    saving,
    savingIds,
    applyWorkCoefficient,
    refetch,
  } = scenarios
  const [sectionOpen, setSectionOpen] = React.useState(false)
  const [coefficientOpen, setCoefficientOpen] = React.useState(false)
  const [workDialog, setWorkDialog] =
    React.useState<WorkDialogState>(EMPTY_WORK_DIALOG)
  const [materialDialog, setMaterialDialog] =
    React.useState<MaterialDialogState>(EMPTY_MATERIAL_DIALOG)
  const [archiveRequest, setArchiveRequest] =
    React.useState<EstimateArchiveRequest | null>(null)
  const [workSearch, setWorkSearch] = React.useState("")
  const [materialSearch, setMaterialSearch] = React.useState("")
  const coefficientTriggered = useRef(false)
  const workReplacingRef = useRef(false)
  const [importOpen, setImportOpen] = React.useState(false)
  const importTriggered = useRef(false)

  const estimateSearch = searchParams.get("q")?.trim() ?? ""
  const searchActive = estimateSearch.length > 0
  const deferredSearch = useDeferredValue(estimateSearch)

  // Stabilise visibleSections: only recompute when content sections actually change
  const nextSections = content?.sections ?? EMPTY_SECTIONS
  const [sectionsForMemo, setSectionsForMemo] = React.useState(nextSections)
  const [prevSections, setPrevSections] = React.useState(nextSections)

  if (nextSections !== prevSections) {
    setPrevSections(nextSections)
    const isSame =
      nextSections.length === sectionsForMemo.length &&
      nextSections.every((s, i) => s === sectionsForMemo[i])
    if (!isSame) {
      setSectionsForMemo(nextSections)
    }
  }

  const visibleSections = React.useMemo(
    () => filterSections(sectionsForMemo, deferredSearch),
    [sectionsForMemo, deferredSearch]
  )

  const sectionIndexMap = React.useMemo(() => {
    const map = new Map<string, number>()
    sectionsForMemo.forEach((s: ProjectEstimateContentSection, i: number) =>
      map.set(s.id, i)
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
  const canSearchMaterials =
    materialSearch.trim().length >= OPTION_SEARCH_MIN_LENGTH

  // Duplicate protection: track already-added directory item codes
  const addedWorkCodes = React.useMemo(() => {
    if (!content) return new Set<string>()
    const codes = new Set<string>()
    for (const s of content.sections) {
      for (const w of s.works) {
        if (w.code) codes.add(w.code)
      }
    }
    return codes
  }, [content])

  const addedMaterialCodes = React.useMemo(() => {
    if (!materialDialog.work) return new Set<string>()
    const codes = new Set<string>()
    for (const m of materialDialog.work.materials) {
      if (m.code) codes.add(m.code)
    }
    return codes
  }, [materialDialog.work])



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
    if (searchParams.get("dialog") !== "import-estimate") {
      importTriggered.current = false
      return
    }
    if (importTriggered.current) return
    importTriggered.current = true

    setImportOpen(true)
    const params = new URLSearchParams(searchParams.toString())
    params.delete("dialog")
    const nextSearch = params.toString()
    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname)
  }, [pathname, router, searchParams])

  React.useEffect(() => {
    const handleExport = () => {
      if (content) {
        exportEstimateToExcel(content)
      }
    }
    window.addEventListener("project-estimate:export", handleExport)
    return () => {
      window.removeEventListener("project-estimate:export", handleExport)
    }
  }, [content])



  const workOptions = useQuery({
    queryKey: projectsQueryKeys.estimateWorkOptions(
      projectId,
      recordId,
      workParams
    ),
    queryFn: () =>
      fetchProjectEstimateWorkOptions({
        projectId,
        recordId,
        params: workParams,
      }),
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

  const clearEstimateSearch = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("q")
    const nextSearch = params.toString()
    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname)
  }, [pathname, router, searchParams])

  const openWorkDialog = useCallback(
    async (sectionId?: string) => {
      const target = sectionId ?? (await scenarios.ensureSection())
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
    [scenarios]
  )

  const openReplaceWorkDialog = useCallback(
    (work: ProjectEstimateContentWork) => {
      setWorkSearch("")
      setWorkDialog({
        open: true,
        mode: "replace",
        sectionId: work.sectionId,
        work,
        selected: null,
      })
    },
    []
  )

  const openMaterialDialog = useCallback((work: ProjectEstimateContentWork) => {
    setMaterialDialog({ open: true, work, selected: null })
  }, [])

  const confirmArchive = useCallback(async () => {
    if (!archiveRequest) return
    const { type, id } = archiveRequest
    if (type === "section") {
      await scenarios.archiveSection(id)
    } else if (type === "work") {
      await scenarios.archiveWork(id)
    } else if (type === "material") {
      await scenarios.archiveMaterial(id)
    }
    setArchiveRequest(null)
  }, [archiveRequest, scenarios])

  const createSection = useCallback(
    async (data: { name: string }) => {
      const title = parseText(data.name)
      if (!title) return

      await scenarios.createSection(title)
      setSectionOpen(false)
    },
    [scenarios]
  )

  const addDirectoryWork = useCallback(
    async (
      selected: ProjectEstimateOptionRow,
      quantity: number,
      price: number
    ) => {
      if (!workDialog.sectionId) return

      await scenarios.addDirectoryWork(workDialog.sectionId, selected, quantity, price)
    },
    [scenarios, workDialog.sectionId]
  )

  const replaceDirectoryWork = useCallback(
    async (selected: ProjectEstimateOptionRow) => {
      if (!workDialog.work) return
      try {
        await scenarios.replaceDirectoryWork(workDialog.work.id, selected)
        setWorkDialog(EMPTY_WORK_DIALOG)
      } catch (err) {
        console.error("Replace work failed:", err)
        // диалог остаётся открытым, пользователь может повторить
      } finally {
        workReplacingRef.current = false
      }
    },
    [scenarios, workDialog.work]
  )

  const addDirectoryMaterial = useCallback(
    async (
      selected: ProjectEstimateMaterialOptionRow,
      quantity: number,
      consumption: number | null,
      price: number,
      changedField: "quantity" | "consumption" | "price"
    ) => {
      if (!materialDialog.work) return

      await scenarios.addDirectoryMaterial(
        materialDialog.work.id,
        selected,
        quantity,
        consumption,
        price,
        changedField
      )
    },
    [scenarios, materialDialog.work]
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
      onArchive: setArchiveRequest,
      onMoveSection: scenarios.moveSection,
      onMoveWork: scenarios.moveWork,
      onAddSection: () => setSectionOpen(true),
      onAddWork: openWorkDialog,
      onAddMaterial: openMaterialDialog,
      onReplaceWork: openReplaceWorkDialog,
      onUpdateWork: scenarios.updateWork,
      onUpdateMaterial: scenarios.updateMaterial,
    }),
    [
      savingIds,
      searchActive,
      scenarios.moveSection,
      scenarios.moveWork,
      openWorkDialog,
      openMaterialDialog,
      openReplaceWorkDialog,
      scenarios.updateWork,
      scenarios.updateMaterial,
    ]
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
            {loadError ?? "Не удалось загрузить смету"}
          </AlertDescription>
        </Alert>
        <Button className="w-fit" variant="outline" onClick={() => refetch()}>
          Повторить
        </Button>
      </div>
    )
  }

  return (
    <EstimateEditorContext.Provider value={contextValue}>
      <div className="flex h-full min-h-0 flex-1 flex-col">
        {mutationError && (
          <Alert variant="destructive" className="mx-1 mt-1">
            <AlertTitle>Ошибка сохранения</AlertTitle>
            <AlertDescription>{mutationError}</AlertDescription>
          </Alert>
        )}
        <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-lg border bg-background p-1">
          {content.sections.length === 0 ? (
            <EstimateEmptyState onCreateClick={() => setSectionOpen(true)} />
          ) : visibleSections.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-4 text-center text-xs text-muted-foreground">
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
          addedCodes={addedWorkCodes}
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
          addedCodes={addedMaterialCodes}
          onQueryChange={setMaterialSearch}
          onOpenChange={handleMaterialPickerOpenChange}
          onSelect={handleMaterialSelect}
          onDirectorySubmit={addDirectoryMaterial}
        />
        <EstimateWorkCoefficientDialog
          open={coefficientOpen}
          onOpenChange={handleCoefficientOpenChange}
          projectId={projectId}
          recordId={recordId}
          saving={saving}
          applyWorkCoefficient={applyWorkCoefficient}
        />
        <AlertDialog
          open={archiveRequest !== null}
          onOpenChange={handleArchiveOpenChange}
        >
          <AlertDialogContent className="sm:max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle>{archiveRequest?.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {archiveRequest?.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={saving}
                onClick={() => setArchiveRequest(null)}
              >
                Отмена
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={saving}
                onClick={confirmArchive}
              >
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <EstimateImportDialog
          projectId={projectId}
          recordId={recordId}
          open={importOpen}
          onOpenChange={setImportOpen}
          onImportSuccess={refetch}
        />
      </div>
    </EstimateEditorContext.Provider>
  )
}
