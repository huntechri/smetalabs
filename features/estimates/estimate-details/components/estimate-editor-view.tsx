"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EditableBadge } from "@/components/ui/editable-badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  fetchProjectEstimateMaterialOptions,
  fetchProjectEstimateWorkOptions,
  type EstimateContentChangeInput,
} from "@/features/estimates/api/project-estimate-content-client"
import { useProjectEstimateContent } from "@/features/estimates/hooks/use-project-estimate-content"
import { projectsQueryKeys } from "@/features/projects/api/projects-query-keys"
import { formatConsumption, formatMoney, parseDecimalInput } from "@/lib/formatters"
import type {
  ProjectEstimateContentMaterial,
  ProjectEstimateContentWork,
  ProjectEstimateMaterialOptionRow,
  ProjectEstimateOptionRow,
} from "@/types/project-estimate-content"

type WorkDialogState = {
  open: boolean
  sectionId: string | null
  selected: ProjectEstimateOptionRow | null
}

type MaterialDialogState = {
  open: boolean
  work: ProjectEstimateContentWork | null
  selected: ProjectEstimateMaterialOptionRow | null
}

function decimal(value: FormDataEntryValue | null, fallback?: number) {
  const raw = String(value ?? "").replace(",", ".").trim()
  if (!raw) return fallback
  const number = Number(raw)
  return Number.isFinite(number) ? number : fallback
}

function text(value: FormDataEntryValue | null) {
  const result = String(value ?? "").trim()
  return result || null
}

function statusText(status: string) {
  if (status === "completed") return "Завершена"
  if (status === "in_progress") return "В работе"
  return "Новая"
}

export function EstimateEditorView({ projectId, recordId }: { projectId: string; recordId: string }) {
  const { content, loading, isFetching, error, saving, applyChange, refetch } =
    useProjectEstimateContent(projectId, recordId)
  const [sectionOpen, setSectionOpen] = React.useState(false)
  const [workDialog, setWorkDialog] = React.useState<WorkDialogState>({ open: false, sectionId: null, selected: null })
  const [materialDialog, setMaterialDialog] = React.useState<MaterialDialogState>({ open: false, work: null, selected: null })
  const [workSearch, setWorkSearch] = React.useState("")
  const [materialSearch, setMaterialSearch] = React.useState("")
  const [message, setMessage] = React.useState<string | null>(null)

  const workParams = React.useMemo(() => ({ q: workSearch, limit: 30, cursor: 0 }), [workSearch])
  const materialParams = React.useMemo(() => ({ q: materialSearch, limit: 30, cursor: 0 }), [materialSearch])
  const workOptions = useQuery({
    queryKey: projectsQueryKeys.estimateWorkOptions(projectId, recordId, workParams),
    queryFn: () => fetchProjectEstimateWorkOptions({ projectId, recordId, params: workParams }),
    enabled: workDialog.open,
    staleTime: 30_000,
  })
  const materialOptions = useQuery({
    queryKey: projectsQueryKeys.estimateMaterialOptions(projectId, recordId, materialParams),
    queryFn: () => fetchProjectEstimateMaterialOptions({ projectId, recordId, params: materialParams }),
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
    const next = await save({ action: "create_section", payload: { title: "Без раздела" } }, "Не удалось добавить раздел")
    return next.sections[0]?.id ?? null
  }

  const openWorkDialog = async (sectionId?: string) => {
    const target = sectionId ?? (await ensureSection())
    if (target) setWorkDialog({ open: true, sectionId: target, selected: null })
  }

  const archive = async (input: EstimateContentChangeInput) => {
    if (!window.confirm("Убрать строку из сметы?")) return
    await save(input, "Не удалось удалить строку")
  }

  const createSection = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = text(new FormData(event.currentTarget).get("title"))
    if (!title) return
    await save({ action: "create_section", payload: { title } }, "Не удалось добавить раздел")
    setSectionOpen(false)
  }

  const addManualWork = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!workDialog.sectionId) return
    const form = new FormData(event.currentTarget)
    const title = text(form.get("title"))
    const unit = text(form.get("unit"))
    if (!title || !unit) return
    await save({
      action: "add_manual_work",
      payload: {
        sectionId: workDialog.sectionId,
        title,
        unitCode: unit,
        unitLabel: unit,
        quantity: decimal(form.get("quantity"), 1),
        price: decimal(form.get("price"), 0),
        category: text(form.get("category")),
        notes: text(form.get("notes")),
      },
    }, "Не удалось добавить работу")
  }

  const addDirectoryWork = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!workDialog.sectionId || !workDialog.selected) return
    const form = new FormData(event.currentTarget)
    await save({
      action: "add_work_from_directory",
      payload: {
        sectionId: workDialog.sectionId,
        directoryWorkId: workDialog.selected.id,
        quantity: decimal(form.get("quantity"), 1),
        price: decimal(form.get("price"), workDialog.selected.price),
      },
    }, "Не удалось добавить работу")
    setWorkDialog((current) => ({ ...current, selected: null }))
  }

  const addManualMaterial = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!materialDialog.work) return
    const form = new FormData(event.currentTarget)
    const title = text(form.get("title"))
    const unit = text(form.get("unit"))
    if (!title || !unit) return
    const consumption = decimal(form.get("consumption"), undefined) ?? null
    await save({
      action: "add_manual_material",
      payload: {
        workId: materialDialog.work.id,
        title,
        unitCode: unit,
        unitLabel: unit,
        quantity: decimal(form.get("quantity"), undefined),
        consumption,
        price: decimal(form.get("price"), 0),
        supplierName: text(form.get("supplierName")),
        notes: text(form.get("notes")),
        changedField: consumption ? "consumption" : "quantity",
      },
    }, "Не удалось добавить материал")
  }

  const addDirectoryMaterial = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!materialDialog.work || !materialDialog.selected) return
    const form = new FormData(event.currentTarget)
    const consumption = decimal(form.get("consumption"), undefined) ?? null
    await save({
      action: "add_material_from_directory",
      payload: {
        workId: materialDialog.work.id,
        directoryMaterialId: materialDialog.selected.id,
        quantity: decimal(form.get("quantity"), undefined),
        consumption,
        price: decimal(form.get("price"), materialDialog.selected.price),
        changedField: consumption ? "consumption" : "quantity",
      },
    }, "Не удалось добавить материал")
    setMaterialDialog((current) => ({ ...current, selected: null }))
  }

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Загрузка сметы...</div>

  if (error || !content) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error ?? "Не удалось загрузить смету"}
        </div>
        <Button className="w-fit" variant="outline" onClick={() => refetch()}>Повторить</Button>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold">{content.record.name}</h1>
            <Badge variant="outline">{statusText(content.record.status)}</Badge>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>Работы: {formatMoney(content.summary.worksAmount)}</span>
            <span>Материалы: {formatMoney(content.summary.materialsAmount)}</span>
            <span>Итого: {formatMoney(content.summary.totalAmount)}</span>
            {isFetching ? <span>обновление...</span> : null}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">{saving ? "Сохраняется" : message}</div>
      </div>

      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto">
        {content.sections.length === 0 ? (
          <div className="flex min-h-96 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
            <h2 className="text-lg font-semibold">Смета пока пустая.</h2>
            <p className="mt-1 text-sm text-muted-foreground">Добавьте раздел или первую работу.</p>
            <div className="mt-4 flex gap-2">
              <Button disabled={saving} onClick={() => setSectionOpen(true)}>Раздел</Button>
              <Button disabled={saving} variant="outline" onClick={() => openWorkDialog()}>Работа</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {content.sections.map((section) => (
              <section key={section.id} className="rounded-lg border bg-card">
                <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">Раздел {section.number}</Badge>
                      <span className="font-medium">{section.title}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span>Работы: {formatMoney(section.worksAmount)}</span>
                      <span>Материалы: {formatMoney(section.materialsAmount)}</span>
                      <span>Итого: {formatMoney(section.totalAmount)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={saving} size="sm" variant="outline" onClick={() => openWorkDialog(section.id)}>Работа</Button>
                    <Button disabled={saving} size="sm" variant="destructive" onClick={() => archive({ action: "archive_section", payload: { sectionId: section.id } })}>Удалить раздел</Button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 p-3">
                  {section.works.length ? section.works.map((work) => (
                    <div key={work.id} className="rounded-md border border-dashed p-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{work.number}</Badge>
                            {work.code ? <Badge variant="outline">{work.code}</Badge> : null}
                            <Badge variant="secondary">{work.unitLabel}</Badge>
                            {work.category ? <Badge variant="outline">{work.category}</Badge> : null}
                          </div>
                          <Textarea
                            defaultValue={work.title}
                            disabled={saving}
                            onBlur={(event) => {
                              const title = event.currentTarget.value.trim()
                              if (title && title !== work.title) {
                                save({ action: "update_work", payload: { workId: work.id, title } }, "Не удалось сохранить изменение")
                              }
                            }}
                          />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-96">
                          <EditableBadge label="Кол-во" suffix={work.unitLabel} value={work.quantity} onChange={(value) => save({ action: "update_work", payload: { workId: work.id, quantity: Number(value) } }, "Не удалось сохранить изменение")} />
                          <EditableBadge label="Цена" value={work.price} onChange={(value) => save({ action: "update_work", payload: { workId: work.id, price: Number(value) } }, "Не удалось сохранить изменение")} />
                          <Badge variant="outline" className="justify-center">{formatMoney(work.totalAmount)}</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button disabled={saving} size="sm" variant="outline" onClick={() => setMaterialDialog({ open: true, work, selected: null })}>Материал</Button>
                          <Button disabled={saving} size="sm" variant="destructive" onClick={() => archive({ action: "archive_work", payload: { workId: work.id } })}>Удалить</Button>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {work.materials.map((material) => (
                          <MaterialCard
                            key={material.id}
                            material={material}
                            saving={saving}
                            onArchive={() => archive({ action: "archive_material", payload: { materialId: material.id } })}
                            onChange={(payload) => save({ action: "update_material", payload: { materialId: material.id, ...payload } }, "Не удалось сохранить изменение")}
                          />
                        ))}
                      </div>
                    </div>
                  )) : <div className="p-4 text-sm text-muted-foreground">В разделе пока нет работ.</div>}
                </div>
              </section>
            ))}
            <div className="flex justify-end"><Button disabled={saving} variant="outline" onClick={() => setSectionOpen(true)}>Раздел</Button></div>
          </div>
        )}
      </div>

      <Dialog open={sectionOpen} onOpenChange={setSectionOpen}>
        <DialogContent><form onSubmit={createSection}><DialogHeader><DialogTitle>Создать раздел</DialogTitle><DialogDescription>Номер раздела будет назначен автоматически.</DialogDescription></DialogHeader><div className="py-4"><Input name="title" placeholder="Название раздела" required /></div><DialogFooter><Button disabled={saving}>Создать</Button></DialogFooter></form></DialogContent>
      </Dialog>

      <WorkPickerDialog state={workDialog} query={workSearch} saving={saving} options={workOptions.data?.data ?? []} loading={workOptions.isLoading} onQueryChange={setWorkSearch} onOpenChange={(open) => !open && setWorkDialog({ open: false, sectionId: null, selected: null })} onSelect={(selected) => setWorkDialog((current) => ({ ...current, selected }))} onManualSubmit={addManualWork} onDirectorySubmit={addDirectoryWork} />
      <MaterialPickerDialog state={materialDialog} query={materialSearch} saving={saving} options={materialOptions.data?.data ?? []} loading={materialOptions.isLoading} onQueryChange={setMaterialSearch} onOpenChange={(open) => !open && setMaterialDialog({ open: false, work: null, selected: null })} onSelect={(selected) => setMaterialDialog((current) => ({ ...current, selected }))} onManualSubmit={addManualMaterial} onDirectorySubmit={addDirectoryMaterial} />
    </div>
  )
}

function MaterialCard({ material, saving, onArchive, onChange }: { material: ProjectEstimateContentMaterial; saving: boolean; onArchive: () => void; onChange: (payload: { title?: string; quantity?: number; consumption?: number | null; price?: number; changedField?: "quantity" | "consumption" | "price" }) => void }) {
  return (
    <div className="rounded-md border border-dashed bg-background p-3">
      <div className="mb-2 flex items-start justify-between gap-2"><div className="flex flex-wrap gap-2"><Badge variant="outline">{material.number}</Badge>{material.code ? <Badge variant="outline">{material.code}</Badge> : null}<Badge variant="secondary">{material.unitLabel}</Badge></div><Button disabled={saving} size="sm" variant="destructive" onClick={onArchive}>Удалить</Button></div>
      <Textarea disabled={saving} defaultValue={material.title} onBlur={(event) => { const title = event.currentTarget.value.trim(); if (title && title !== material.title) onChange({ title }) }} />
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <EditableBadge label="Кол-во" value={material.quantity} onChange={(value) => onChange({ quantity: Number(value), changedField: "quantity" })} />
        <EditableBadge label="Расход" value={material.consumption ?? ""} formatDisplay={() => material.consumption === null ? "—" : formatConsumption(material.consumption)} onChange={(value) => onChange({ consumption: parseDecimalInput(value), changedField: "consumption" })} />
        <EditableBadge label="Цена" value={material.price} onChange={(value) => onChange({ price: Number(value), changedField: "price" })} />
        <Badge variant="outline" className="justify-center">{formatMoney(material.totalAmount)}</Badge>
      </div>
    </div>
  )
}

function WorkPickerDialog({ state, query, saving, options, loading, onQueryChange, onOpenChange, onSelect, onManualSubmit, onDirectorySubmit }: { state: WorkDialogState; query: string; saving: boolean; options: ProjectEstimateOptionRow[]; loading: boolean; onQueryChange: (value: string) => void; onOpenChange: (open: boolean) => void; onSelect: (row: ProjectEstimateOptionRow) => void; onManualSubmit: (event: React.FormEvent<HTMLFormElement>) => void; onDirectorySubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <Dialog open={state.open} onOpenChange={onOpenChange}><DialogContent className="max-h-[82vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Добавить работу</DialogTitle><DialogDescription>Выберите строку из справочника или заполните ручную работу.</DialogDescription></DialogHeader><Input placeholder="Поиск работ" value={query} onChange={(event) => onQueryChange(event.target.value)} /><div className="grid gap-2 rounded-md border p-2">{loading ? <div className="p-2 text-sm text-muted-foreground">Загрузка работ...</div> : options.length ? options.map((work) => <div key={work.id} className="flex items-center justify-between gap-3 rounded-md border p-2"><div className="min-w-0"><div className="truncate text-sm font-medium">{work.title}</div><div className="text-xs text-muted-foreground">{work.code ?? "Без кода"} · {work.unitLabel} · {formatMoney(work.price)} · {work.category}</div></div><Button size="sm" onClick={() => onSelect(work)}>Добавить</Button></div>) : <div className="p-2 text-sm text-muted-foreground">Работы не найдены.</div>}</div>{state.selected ? <form onSubmit={onDirectorySubmit} className="grid gap-3 rounded-md border p-3"><div className="text-sm font-medium">{state.selected.title}</div><div className="grid gap-3 sm:grid-cols-2"><Input name="quantity" defaultValue="1" /><Input name="price" defaultValue={state.selected.price} /></div><Button disabled={saving}>Подтвердить</Button></form> : null}<form onSubmit={onManualSubmit} className="grid gap-3 rounded-md border p-3"><div className="text-sm font-medium">Добавить вручную</div><Input name="title" placeholder="Название" /><div className="grid gap-3 sm:grid-cols-3"><Input name="unit" placeholder="Ед. изм." /><Input name="quantity" defaultValue="1" /><Input name="price" defaultValue="0" /></div><Input name="category" placeholder="Категория" /><Textarea name="notes" placeholder="Примечание" /><Button disabled={saving} variant="outline">Добавить вручную</Button></form></DialogContent></Dialog>
}

function MaterialPickerDialog({ state, query, saving, options, loading, onQueryChange, onOpenChange, onSelect, onManualSubmit, onDirectorySubmit }: { state: MaterialDialogState; query: string; saving: boolean; options: ProjectEstimateMaterialOptionRow[]; loading: boolean; onQueryChange: (value: string) => void; onOpenChange: (open: boolean) => void; onSelect: (row: ProjectEstimateMaterialOptionRow) => void; onManualSubmit: (event: React.FormEvent<HTMLFormElement>) => void; onDirectorySubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <Dialog open={state.open} onOpenChange={onOpenChange}><DialogContent className="max-h-[82vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Добавить материал</DialogTitle><DialogDescription>Материал добавится внутрь выбранной работы.</DialogDescription></DialogHeader><Input placeholder="Поиск материалов" value={query} onChange={(event) => onQueryChange(event.target.value)} /><div className="grid gap-2 rounded-md border p-2">{loading ? <div className="p-2 text-sm text-muted-foreground">Загрузка материалов...</div> : options.length ? options.map((material) => <div key={material.id} className="flex items-center justify-between gap-3 rounded-md border p-2"><div className="min-w-0"><div className="truncate text-sm font-medium">{material.title}</div><div className="text-xs text-muted-foreground">{material.code ?? "Без кода"} · {material.unitLabel} · {formatMoney(material.price)} · {material.category}{material.supplierName ? ` · ${material.supplierName}` : ""}</div></div><Button size="sm" onClick={() => onSelect(material)}>Добавить</Button></div>) : <div className="p-2 text-sm text-muted-foreground">Материалы не найдены.</div>}</div>{state.selected ? <form onSubmit={onDirectorySubmit} className="grid gap-3 rounded-md border p-3"><div className="text-sm font-medium">{state.selected.title}</div><div className="grid gap-3 sm:grid-cols-3"><Input name="quantity" placeholder="Количество материала" defaultValue="1" /><Input name="consumption" placeholder="Расход" /><Input name="price" defaultValue={state.selected.price} /></div><Button disabled={saving}>Подтвердить</Button></form> : null}<form onSubmit={onManualSubmit} className="grid gap-3 rounded-md border p-3"><div className="text-sm font-medium">Добавить вручную</div><Input name="title" placeholder="Название" /><div className="grid gap-3 sm:grid-cols-4"><Input name="unit" placeholder="Ед. изм." /><Input name="quantity" placeholder="Количество" defaultValue="1" /><Input name="consumption" placeholder="Расход" /><Input name="price" defaultValue="0" /></div><Input name="supplierName" placeholder="Поставщик" /><Textarea name="notes" placeholder="Примечание" /><Button disabled={saving} variant="outline">Добавить вручную</Button></form></DialogContent></Dialog>
}
