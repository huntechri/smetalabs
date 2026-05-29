import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useSearchParams } from "next/navigation"
import type { EstimateContentChangeInput } from "@/features/estimates/api/project-estimate-content-client"
import { useProjectEstimateContent } from "@/features/estimates/hooks/use-project-estimate-content"
import {
  filterSections,
  moveItem,
  sortPayload,
  type MoveDirection,
} from "@/features/estimates/estimate-details/lib/estimate-editor-helpers"
import type {
  EstimateArchiveRequest,
  MaterialDialogState,
  WorkDialogState,
} from "@/features/estimates/estimate-details/types"
import type {
  ProjectEstimateContentSection,
  ProjectEstimateContentWork,
  ProjectEstimateMaterialOptionRow,
  ProjectEstimateOptionRow,
} from "@/types/project-estimate-content"

export const EMPTY_WORK_DIALOG: WorkDialogState = {
  open: false,
  mode: "add",
  sectionId: null,
  work: null,
  selected: null,
}

export const EMPTY_MATERIAL_DIALOG: MaterialDialogState = {
  open: false,
  work: null,
  selected: null,
}

export const EMPTY_SECTIONS: ProjectEstimateContentSection[] = []
export const OPTION_SEARCH_MIN_LENGTH = 3
export const WORK_COEFFICIENT_DIALOG_KEY = "work-coefficient"

export function useEstimateEditorState(projectId: string, recordId: string) {
  const searchParams = useSearchParams()
  const {
    content,
    loading,
    loadError,
    mutationError,
    saving,
    savingIds,
    applyChange,
    applyWorkCoefficient,
    refetch,
    getSections,
  } = useProjectEstimateContent(projectId, recordId)

  const [sectionOpen, setSectionOpen] = useState(false)
  const [coefficientOpen, setCoefficientOpen] = useState(false)
  const [workDialog, setWorkDialog] =
    useState<WorkDialogState>(EMPTY_WORK_DIALOG)
  const [materialDialog, setMaterialDialog] = useState<MaterialDialogState>(
    EMPTY_MATERIAL_DIALOG
  )
  const [archiveRequest, setArchiveRequest] =
    useState<EstimateArchiveRequest | null>(null)
  const [workSearch, setWorkSearch] = useState("")
  const [materialSearch, setMaterialSearch] = useState("")
  const [importOpen, setImportOpen] = useState(false)

  const ensuringRef = useRef(false)
  const ensurePendingRef = useRef<Promise<string | null> | null>(null)
  const coefficientTriggered = useRef(false)
  const workReplacingRef = useRef(false)
  const importTriggered = useRef(false)

  const estimateSearch = searchParams.get("q")?.trim() ?? ""
  const searchActive = estimateSearch.length > 0
  const deferredSearch = useDeferredValue(estimateSearch)

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

  const sectionIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    sectionsForMemo.forEach((s: ProjectEstimateContentSection, i: number) =>
      map.set(s.id, i)
    )
    return map
  }, [sectionsForMemo])

  const workParams = useMemo(
    () => ({ q: workSearch, limit: 30, cursor: 0 }),
    [workSearch]
  )
  const materialParams = useMemo(
    () => ({ q: materialSearch, limit: 30, cursor: 0 }),
    [materialSearch]
  )

  const canSearchWorks = workSearch.trim().length >= OPTION_SEARCH_MIN_LENGTH
  const canSearchMaterials =
    materialSearch.trim().length >= OPTION_SEARCH_MIN_LENGTH

  const addedWorkCodes = useMemo(() => {
    if (!content) return new Set<string>()
    const codes = new Set<string>()
    for (const s of content.sections) {
      for (const w of s.works) {
        if (w.code) codes.add(w.code)
      }
    }
    return codes
  }, [content])

  const addedMaterialCodes = useMemo(() => {
    if (!materialDialog.work) return new Set<string>()
    const codes = new Set<string>()
    for (const m of materialDialog.work.materials) {
      if (m.code) codes.add(m.code)
    }
    return codes
  }, [materialDialog.work])

  useEffect(() => {
    if (searchParams.get("dialog") !== WORK_COEFFICIENT_DIALOG_KEY) {
      coefficientTriggered.current = false
      return
    }
    if (coefficientTriggered.current) return
    coefficientTriggered.current = true

    setCoefficientOpen(true)
    const params = new URLSearchParams(searchParams.toString())
    params.delete("dialog")
    window.history.replaceState(null, "", `?${params.toString()}`)
  }, [searchParams])

  useEffect(() => {
    if (searchParams.get("dialog") !== "import-estimate") {
      importTriggered.current = false
      return
    }
    if (importTriggered.current) return
    importTriggered.current = true

    setImportOpen(true)
    const params = new URLSearchParams(searchParams.toString())
    params.delete("dialog")
    window.history.replaceState(null, "", `?${params.toString()}`)
  }, [searchParams])

  const save = useCallback(
    async (input: EstimateContentChangeInput) => {
      try {
        return await applyChange(input)
      } catch (err) {
        return null
      }
    },
    [applyChange]
  )

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
    (sectionId: string, direction: MoveDirection) => {
      const current = getSections()
      if (!current) return
      const next = moveItem(current, sectionId, direction)
      if (next === current) return
      void save({
        action: "reorder_sections",
        payload: { items: sortPayload(next) },
      })
    },
    [getSections, save]
  )

  const moveWork = useCallback(
    (sectionId: string, workId: string, direction: MoveDirection) => {
      const sections = getSections()
      const section = sections?.find((s) => s.id === sectionId)
      if (!section) return
      const next = moveItem(section.works, workId, direction)
      if (next === section.works) return
      void save({
        action: "reorder_works",
        payload: { sectionId, items: sortPayload(next) },
      })
    },
    [getSections, save]
  )

  const openWorkDialog = useCallback(
    async (sectionId: string) => {
      if (!sectionId) sectionId = (await ensureSection()) ?? ""
      if (!sectionId) return
      setWorkSearch("")
      setWorkDialog({
        open: true,
        mode: "add",
        sectionId,
        work: null,
        selected: null,
      })
    },
    [ensureSection]
  )

  const openReplaceWorkDialog = useCallback(
    (work: ProjectEstimateContentWork) => {
      workReplacingRef.current = false
      setWorkSearch("")
      setWorkDialog({
        open: true,
        mode: "replace",
        sectionId: null,
        work,
        selected: null,
      })
    },
    []
  )

  const openMaterialDialog = useCallback((work: ProjectEstimateContentWork) => {
    setMaterialSearch("")
    setMaterialDialog({ open: true, work, selected: null })
  }, [])

  const confirmArchive = useCallback(async () => {
    if (!archiveRequest) return
    await save(archiveRequest.input)
    setArchiveRequest(null)
  }, [archiveRequest, save])

  const createSection = useCallback(
    (title: string) => {
      void save({ action: "create_section", payload: { title } })
      setSectionOpen(false)
    },
    [save]
  )

  const addDirectoryWork = useCallback(
    (row: ProjectEstimateOptionRow) => {
      if (!workDialog.sectionId) return
      void save({
        action: "add_work_from_directory",
        payload: {
          sectionId: workDialog.sectionId,
          directoryWorkId: row.id,
          price: row.price,
        },
      })
      setWorkDialog(EMPTY_WORK_DIALOG)
    },
    [workDialog.sectionId, save]
  )

  const replaceDirectoryWork = useCallback(
    (row: ProjectEstimateOptionRow) => {
      if (!workDialog.work) return
      void save({
        action: "update_work",
        payload: {
          workId: workDialog.work.id,

          price: row.price,
        },
      })
      setWorkDialog(EMPTY_WORK_DIALOG)
    },
    [workDialog.work, save]
  )

  const addDirectoryMaterial = useCallback(
    (row: ProjectEstimateMaterialOptionRow) => {
      if (!materialDialog.work) return
      void save({
        action: "add_material_from_directory",
        payload: {
          workId: materialDialog.work.id,
          directoryMaterialId: row.id,
          price: row.price,
        },
      })
      setMaterialDialog(EMPTY_MATERIAL_DIALOG)
    },
    [materialDialog.work, save]
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

  return {
    content,
    loading,
    loadError,
    mutationError,
    saving,
    savingIds,
    sectionOpen,
    coefficientOpen,
    workDialog,
    materialDialog,
    archiveRequest,
    workSearch,
    materialSearch,
    importOpen,
    estimateSearch,
    searchActive,
    deferredSearch,
    visibleSections,
    sectionIndexMap,
    workParams,
    materialParams,
    canSearchWorks,
    canSearchMaterials,
    addedWorkCodes,
    addedMaterialCodes,
    setWorkSearch,
    setMaterialSearch,
    setImportOpen,
    setArchiveRequest,
    applyWorkCoefficient,
    refetch,
    save,
    moveSection,
    moveWork,
    openWorkDialog,
    openReplaceWorkDialog,
    openMaterialDialog,
    confirmArchive,
    createSection,
    addDirectoryWork,
    replaceDirectoryWork,
    addDirectoryMaterial,
    handleSectionOpenChange,
    handleCoefficientOpenChange,
    handleWorkPickerOpenChange,
    handleMaterialPickerOpenChange,
    handleArchiveOpenChange,
    handleWorkSelect,
    handleMaterialSelect,
  }
}
