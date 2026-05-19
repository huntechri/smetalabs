"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  fetchProjectEstimateMaterialOptions,
  fetchProjectEstimateWorkOptions,
  type EstimateContentChangeInput,
} from "@/features/estimates/api/project-estimate-content-client"
import { EstimateEditorHeader } from "@/features/estimates/estimate-details/components/estimate-editor-header"
import { EstimateEmptyContent } from "@/features/estimates/estimate-details/components/estimate-empty-content"
import { EstimateMaterialPickerDialog } from "@/features/estimates/estimate-details/components/estimate-material-picker-dialog"
import { EstimateSectionCard } from "@/features/estimates/estimate-details/components/estimate-section-card"
import { EstimateSectionDialog } from "@/features/estimates/estimate-details/components/estimate-section-dialog"
import { EstimateWorkPickerDialog } from "@/features/estimates/estimate-details/components/estimate-work-picker-dialog"
import { parseDecimal, parseText } from "@/features/estimates/estimate-details/lib/estimate-editor-form"
import type {
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
  sectionId: null,
  selected: null,
}

const EMPTY_MATERIAL_DIALOG: MaterialDialogState = {
  open: false,
  work: null,
  selected: null,
}

export function EstimateEditorView({
  projectId,
  recordId,
}: {
  projectId: string
  recordId: string
}) {
  const { content, loading, isFetching, error, saving, applyChange, refetch } =
    useProjectEstimateContent(projectId, recordId)
  const [sectionOpen, setSectionOpen] = React.useState(false)
  const [workDialog, setWorkDialog] = React.useState<WorkDialogState>(EMPTY_WORK_DIALOG)
  const [materialDialog, setMaterialDialog] = React.useState<MaterialDialogState>(EMPTY_MATERIAL_DIALOG)
  const [workSearch, setWorkSearch] = React.useState("")
  const [materialSearch, setMaterialSearch] = React.useState("")
  const [message, setMessage] = React.useState<string | null>(null)

  const workParams = React.useMemo(
    () => ({ q: workSearch, limit: 30, cursor: 0 }),
    [workSearch]
  )
  const materialParams = React.useMemo(
    () => ({ q: materialSearch, limit: 30, cursor: 0 }),
    [materialSearch]
  )

  const workOptions = useQuery({
    queryKey: projectsQueryKeys.estimateWorkOptions(projectId, recordId, workParams),
    queryFn: () =>
      fetchProjectEstimateWorkOptions({ projectId, recordId, params: workParams }),
    enabled: workDialog.open,
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
    enabled: materialDialog.open,
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
    if (target) setWorkDialog({ open: true, sectionId: target, selected: null })
  }

  const openMaterialDialog = (work: ProjectEstimateContentWork) => {
    setMaterialDialog({ open: true, work, selected: null })
  }

  const archive = async (input: EstimateContentChangeInput) => {
    if (!window.confirm("Убрать строку из сметы?")) return
    await save(input, "Не удалось удалить строку")
  }

  const createSection = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const title = parseText(new FormData(event.currentTarget).get("title"))
    if (!title) return

    await save(
      { action: "create_section", payload: { title } },
      "Не удалось добавить раздел"
    )
    setSectionOpen(false)
  }

  const addManualWork = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!workDialog.sectionId) return

    const form = new FormData(event.currentTarget)
    const title = parseText(form.get("title"))
    const unit = parseText(form.get("unit"))
    if (!title || !unit) return

    await save(
      {
        action: "add_manual_work",
        payload: {
          sectionId: workDialog.sectionId,
          title,
          unitCode: unit,
          unitLabel: unit,
          quantity: parseDecimal(form.get("quantity"), 1),
          price: parseDecimal(form.get("price"), 0),
          category: parseText(form.get("category")),
          notes: parseText(form.get("notes")),
        },
      },
      "Не удалось добавить работу"
    )
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

  const addManualMaterial = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!materialDialog.work) return

    const form = new FormData(event.currentTarget)
    const title = parseText(form.get("title"))
    const unit = parseText(form.get("unit"))
    if (!title || !unit) return

    const consumption = parseDecimal(form.get("consumption"), undefined) ?? null
    await save(
      {
        action: "add_manual_material",
        payload: {
          workId: materialDialog.work.id,
          title,
          unitCode: unit,
          unitLabel: unit,
          quantity: parseDecimal(form.get("quantity"), undefined),
          consumption,
          price: parseDecimal(form.get("price"), 0),
          supplierName: parseText(form.get("supplierName")),
          notes: parseText(form.get("notes")),
          changedField: consumption ? "consumption" : "quantity",
        },
      },
      "Не удалось добавить материал"
    )
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
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 p-4 lg:p-6">
      <EstimateEditorHeader
        content={content}
        isFetching={isFetching}
        message={message}
        saving={saving}
      />

      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto">
        {content.sections.length === 0 ? (
          <EstimateEmptyContent
            saving={saving}
            onCreateSection={() => setSectionOpen(true)}
            onCreateWork={() => openWorkDialog()}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {content.sections.map((section) => (
              <EstimateSectionCard
                key={section.id}
                section={section}
                saving={saving}
                onArchive={archive}
                onAddWork={openWorkDialog}
                onAddMaterial={openMaterialDialog}
                onSave={save}
              />
            ))}
            <div className="flex justify-end">
              <Button disabled={saving} variant="outline" onClick={() => setSectionOpen(true)}>
                Раздел
              </Button>
            </div>
          </div>
        )}
      </div>

      <EstimateSectionDialog
        open={sectionOpen}
        saving={saving}
        onOpenChange={setSectionOpen}
        onSubmit={createSection}
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
        onSelect={(selected: ProjectEstimateOptionRow) =>
          setWorkDialog((current) => ({ ...current, selected }))
        }
        onManualSubmit={addManualWork}
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
        onManualSubmit={addManualMaterial}
        onDirectorySubmit={addDirectoryMaterial}
      />
    </div>
  )
}
