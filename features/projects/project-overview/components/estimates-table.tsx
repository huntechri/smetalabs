"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, DotsThreeVertical, Spinner } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useProjectEstimateRecords } from "@/features/projects/hooks/use-project-estimate-records"
import { EstimateDeleteDialog } from "@/features/projects/project-overview/components/estimate-delete-dialog"
import { EstimateNameDialog } from "@/features/projects/project-overview/components/estimate-name-dialog"
import {
  formatEstimateAmount,
  formatEstimateDate,
  formatEstimateStatus,
} from "@/features/projects/project-overview/lib/estimate-table-data"
import type {
  EstimateDialogState,
  EstimateRow,
} from "@/features/projects/project-overview/types"

const EMPTY_DIALOG_STATE: EstimateDialogState = {
  open: false,
  estimate: null,
  name: "",
  type: "Основная",
  status: "new",
  error: null,
}

export function EstimatesTable({ projectId }: { projectId: string }) {
  const router = useRouter()
  const {
    records,
    meta,
    loading,
    isFetching,
    error,
    saving,
    createRecord,
    updateRecord,
    deleteRecord,
  } = useProjectEstimateRecords(projectId)
  const [dialogState, setDialogState] =
    React.useState<EstimateDialogState>(EMPTY_DIALOG_STATE)
  const [estimateToDelete, setEstimateToDelete] =
    React.useState<EstimateRow | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)
  const [pageIndex, setPageIndex] = React.useState(0)
  const pageSize = 10

  const pageRows = React.useMemo(
    () => records.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [pageIndex, records]
  )
  const pageCount = Math.max(1, Math.ceil(records.length / pageSize))

  const getEstimateHref = (estimateId: string) =>
    `/projects/${projectId}/estimates/${estimateId}`

  const openEstimate = (estimateId: string) => {
    router.push(getEstimateHref(estimateId))
  }

  const openCreateDialog = () => {
    setDialogState({
      open: true,
      estimate: null,
      name: "",
      type: "Основная",
      status: "new",
      error: null,
    })
  }

  const openEditDialog = (estimate: EstimateRow) => {
    setDialogState({
      open: true,
      estimate,
      name: estimate.name,
      type: estimate.type,
      status: estimate.status,
      error: null,
    })
  }

  const openDeleteDialog = (estimate: EstimateRow) => {
    setDeleteError(null)
    setEstimateToDelete(estimate)
  }

  const closeDialog = () => setDialogState(EMPTY_DIALOG_STATE)

  const closeDeleteDialog = () => {
    setDeleteError(null)
    setEstimateToDelete(null)
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      closeDialog()
      return
    }

    setDialogState((current) => ({ ...current, open }))
  }

  const handleDialogNameChange = (name: string) => {
    setDialogState((current) => ({ ...current, name, error: null }))
  }

  const handleDialogSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    const name = dialogState.name.trim()
    if (!name) {
      setDialogState((current) => ({
        ...current,
        error: "Укажите название сметы",
      }))
      return
    }

    try {
      if (dialogState.estimate) {
        await updateRecord(dialogState.estimate.id, {
          name,
          type: dialogState.type,
          status: dialogState.status,
        })
        closeDialog()
        return
      }

      await createRecord({
        name,
        type: dialogState.type,
        status: dialogState.status,
      })
      closeDialog()
    } catch (err) {
      setDialogState((current) => ({
        ...current,
        error:
          err instanceof Error ? err.message : "Не удалось сохранить смету",
      }))
    }
  }

  const handleDeleteConfirm = async () => {
    if (!estimateToDelete) return

    try {
      await deleteRecord(estimateToDelete.id)
      closeDeleteDialog()
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Не удалось удалить смету"
      )
    }
  }

  return (
    <>
      <Tabs
        defaultValue="estimates"
        className="w-full flex-col justify-start gap-6"
      >
        <div className="flex items-center justify-between px-4 lg:px-6">
          <TabsList className="**:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1">
            <TabsTrigger value="estimates">Сметы</TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            size="sm"
            onClick={openCreateDialog}
            disabled={saving}
          >
            Создать смету
          </Button>
        </div>

        <TabsContent
          value="estimates"
          className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
        >
          {error ? (
            <div className="text-xs text-destructive">{error}</div>
          ) : null}
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                <TableRow>
                  <TableHead>Наименование</TableHead>
                  <TableHead>Тип сметы</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead>Дата создания сметы</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Загрузка смет...
                    </TableCell>
                  </TableRow>
                ) : pageRows.length ? (
                  pageRows.map((estimate) => (
                    <TableRow key={estimate.id}>
                      <TableCell>
                        <button
                          className="inline-flex cursor-pointer text-left text-xs/relaxed font-medium text-foreground underline-offset-4 hover:underline"
                          type="button"
                          onClick={() => openEstimate(estimate.id)}
                        >
                          {estimate.name}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="px-1.5 text-muted-foreground"
                        >
                          {estimate.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="px-1.5 text-muted-foreground"
                        >
                          {estimate.status === "completed" ? (
                            <CheckCircle className="fill-green-500 dark:fill-green-400" />
                          ) : (
                            <Spinner className="animate-spin" />
                          )}
                          {formatEstimateStatus(estimate.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatEstimateAmount(estimate.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatEstimateDate(estimate.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
                                size="icon"
                              >
                                <DotsThreeVertical />
                                <span className="sr-only">Открыть меню</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32">
                              <DropdownMenuItem
                                onSelect={() => openEditDialog(estimate)}
                              >
                                Редактировать
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => openDeleteDialog(estimate)}
                              >
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Сметы не найдены.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between px-4 text-sm text-muted-foreground">
            <div>
              Всего смет: {meta?.total ?? records.length}
              {isFetching ? " · обновление..." : ""}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPageIndex((current) => Math.max(current - 1, 0))
                }
                disabled={pageIndex === 0}
              >
                Назад
              </Button>
              <div className="text-sm font-medium text-foreground">
                {pageIndex + 1} / {pageCount}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPageIndex((current) =>
                    Math.min(current + 1, pageCount - 1)
                  )
                }
                disabled={pageIndex >= pageCount - 1}
              >
                Далее
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <EstimateNameDialog
        state={dialogState}
        saving={saving}
        onOpenChange={handleDialogOpenChange}
        onNameChange={handleDialogNameChange}
        onTypeChange={(type) =>
          setDialogState((current) => ({ ...current, type, error: null }))
        }
        onStatusChange={(status) =>
          setDialogState((current) => ({ ...current, status, error: null }))
        }
        onSubmit={handleDialogSubmit}
      />
      <EstimateDeleteDialog
        estimate={estimateToDelete}
        saving={saving}
        error={deleteError}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog()
        }}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}
