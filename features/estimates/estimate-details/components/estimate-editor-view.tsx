"use client"

import * as React from "react"
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
import {
  fetchProjectEstimateMaterialOptions,
  fetchProjectEstimateWorkOptions,
  type EstimateContentChangeInput,
} from "@/features/estimates/api/project-estimate-content-client"
import { CreateSectionDialog } from "@/features/estimates/estimate-details/components/create-section-dialog"
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

export function EstimateEditorView({
  projectId,
  recordId,
}: {
  projectId: string
  recordId: string
}) {
  const { content, loading, error, saving, applyChange, refetch } =
    useProjectEstimateContent(projectId, recordId)
  const [sectionOpen, setSectionOpen] = React.useState(false)
  const [workDialog, setWorkDialog] = React.useState<WorkDialogState>(EMPTY_WORK_DIALOG)
  const [materialDialog, setMaterialDialog] = React.useState<MaterialDialogState>(EMPTY_MATERIAL_DIALOG)
  const [archiveRequest, setArchiveRequest] = React.useState<EstimateArchiveRequest | null>(null)
  const [workSearch, setWorkSearch] = React.useState("")
  const [materialSearch, setMaterialSearch] = React.useState("")
  const [, setMessage] = React.useState<string | null>(null)

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

  const save = async (input: EstimateContentChangeInput, fallback: string) => {
    setMessage("Сохраняется")
    try {
      const next = await applyChange(input)
      setMessage("Сохранено")
      return next
    } catch (err) {
      setMessage(err instanceof Error ? err.message : fallback)
      throw err
    }
  }

  const ensureSection = async () => {
    const existing = content?.sections[0]?.id
    if (existing) return existing

    const next = await save(
      { action: "create_section", payload: { title: "Без раздела" } },
      "Не удалось добавить раздел"
    )
    return next.sections[0]?.id ?? null
  }

  const openWorkDialog = async (sectionId?: string) => {
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
  }

  const openReplaceWorkDialog = (work: ProjectEstimateContentWork) => {
    setWorkSearch("")
    setWorkDialog({
      open: true,
      mode: "replace",
      sectionId: work.sectionId,
      work,
      selected: null,
    })
  }

  const openMaterialDialog = (work: ProjectEstimateContentWork) => {
    setMaterialDialog({ open: true, work, selected: null })
  }

  const confirmArchive = async () => {
    if (!archiveRequest) return
    await save(archiveRequest.input, archiveRequest.fallback)
    setArchiveRequest(null)
  }

  const createSection = async (data: { name: string }) => {
    const title = parseText(data.name)
    if (!title) return

    await save(
      { action: "create_section", payload: { title } },
      "Не удалось добавить раздел"
    )
    setSectionOpen(false)
  }

  const addDirectoryWork = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!workDialog.sectionId || !workDialog.selected) return

    const form = new FormData(event.currentTarget)
    await save(
      {
        action: "add_work_from_directory",
        payload: {
          sectionId: workDialog.sectionId,
          directoryWorkId: workDialog.selected.id,
          quantity: parseDecimal(form.get("quantity"), 1),
          price: parseDecimal(form.get("price"), workDialog.selected.price),
        },
      },
      "Не удалось добавить работу"
    )
    setWorkDialog((current) => ({ ...current, selected: null }))
  }

  const replaceDirectoryWork = async (selected: ProjectEstimateOptionRow) => {
    if (!workDialog.work) return

    await save(
      {
        action: "update_work",
        payload: {
          workId: workDialog.work.id,
          title: selected.title,
          price: selected.price,
        },
      },
      "Не удалось заменить работу"
    )
    setWorkDialog(EMPTY_WORK_DIALOG)
  }

  const addDirectoryMaterial = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!materialDialog.work || !materialDialog.selected) return

    const form = new FormData(event.currentTarget)
    const consumption = parseDecimal(form.get("consumption"), undefined) ?? null
    await save(
      {
        action: "add_material_from_directory",
        payload: {
          workId: materialDialog.work.id,
          directoryMaterialId: materialDialog.selected.id,
          quantity: parseDecimal(form.get("quantity"), undefined),
          consumption,
          price: parseDecimal(form.get("price"), materialDialog.selected.price),
          changedField: consumption ? "consumption" : "quantity",
        },
      },
      "Не удалось добавить материал"
    )
    setMaterialDialog((current) => ({ ...current, selected: null }))
  }

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
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-xl border bg-background p-1">
        {content.sections.length === 0 ? (
          <EstimateEmptyState onCreateClick={() => setSectionOpen(true)} />
        ) : (
          <div className="flex flex-col gap-4">
            {content.sections.map((section) => (
              <EstimateSectionCard
                key={section.id}
                section={section}
                saving={saving}
                onArchive={setArchiveRequest}
                onAddSection={() => setSectionOpen(true)}
                onAddWork={openWorkDialog}
                onAddMaterial={openMaterialDialog}
                onReplaceWork={openReplaceWorkDialog}
                onSave={save}
              />
            ))}
          </div>
        )}
      </div>

      <CreateSectionDialog
        open={sectionOpen}
        onOpenChange={setSectionOpen}
        onConfirm={createSection}
      />
      <EstimateWorkPickerDialog
        state={workDialog}
        query={workSearch}
        saving={saving}
        options={workOptions.data?.data ?? []}
        loading={workOptions.isLoading}
        onQueryChange={setWorkSearch}
        onOpenChange={(open) => {
          if (!open) setWorkDialog(EMPTY_WORK_DIALOG)
        }}
        onSelect={(selected: ProjectEstimateOptionRow) => {
          setWorkDialog((current) => ({ ...current, selected }))
          if (workDialog.mode === "replace") void replaceDirectoryWork(selected)
        }}
        onDirectorySubmit={addDirectoryWork}
      />
      <EstimateMaterialPickerDialog
        state={materialDialog}
        query={materialSearch}
        saving={saving}
        options={materialOptions.data?.data ?? []}
        loading={materialOptions.isLoading}
        onQueryChange={setMaterialSearch}
        onOpenChange={(open) => {
          if (!open) setMaterialDialog(EMPTY_MATERIAL_DIALOG)
        }}
        onSelect={(selected: ProjectEstimateMaterialOptionRow) =>
          setMaterialDialog((current) => ({ ...current, selected }))
        }
        onDirectorySubmit={addDirectoryMaterial}
      />
      <Dialog
        open={archiveRequest !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveRequest(null)
        }}
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
  )
}
