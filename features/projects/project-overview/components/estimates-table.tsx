"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
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
import { EstimateNameDialog } from "@/features/projects/project-overview/components/estimate-name-dialog"
import {
  ESTIMATES_DATA,
  createLocalEstimate,
  formatEstimateAmount,
  formatEstimateDate,
} from "@/features/projects/project-overview/lib/estimate-table-data"
import type {
  EstimateDialogState,
  EstimateRow,
} from "@/features/projects/project-overview/types"

const EMPTY_DIALOG_STATE: EstimateDialogState = {
  open: false,
  estimate: null,
  name: "",
  error: null,
}

export function EstimatesTable({ data: _data }: { data: unknown[] }) {
  const [data, setData] = React.useState<EstimateRow[]>(ESTIMATES_DATA)
  const [dialogState, setDialogState] =
    React.useState<EstimateDialogState>(EMPTY_DIALOG_STATE)
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const openCreateDialog = () => {
    setDialogState({
      open: true,
      estimate: null,
      name: "",
      error: null,
    })
  }

  const openEditDialog = (estimate: EstimateRow) => {
    setDialogState({
      open: true,
      estimate,
      name: estimate.name,
      error: null,
    })
  }

  const closeDialog = () => {
    setDialogState(EMPTY_DIALOG_STATE)
  }

  const columns = React.useMemo<ColumnDef<EstimateRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Наименование",
        cell: ({ row }) => (
          <Button variant="link" className="w-fit px-0 text-left text-foreground">
            {row.original.name}
          </Button>
        ),
      },
      {
        accessorKey: "type",
        header: "Тип сметы",
        cell: ({ row }) => (
          <Badge variant="outline" className="px-1.5 text-muted-foreground">
            {row.original.type}
          </Badge>
        ),
      },
      {
        accessorKey: "status",
        header: "Статус",
        cell: ({ row }) => (
          <Badge variant="outline" className="px-1.5 text-muted-foreground">
            {row.original.status === "Завершено" ? (
              <CheckCircle className="fill-green-500 dark:fill-green-400" />
            ) : (
              <Spinner className="animate-spin" />
            )}
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "amount",
        header: () => <div className="w-full text-right">Сумма</div>,
        cell: ({ row }) => (
          <div className="text-right font-medium tabular-nums">
            {formatEstimateAmount(row.original.amount)}
          </div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Дата создания сметы",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatEstimateDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Действия</div>,
        cell: ({ row }) => (
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
                <DropdownMenuItem onSelect={() => openEditDialog(row.original)}>
                  Редактировать
                </DropdownMenuItem>
                <DropdownMenuItem>Создать копию</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">Удалить</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

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

  const handleDialogSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const name = dialogState.name.trim()
    if (!name) {
      setDialogState((current) => ({ ...current, error: "Укажите название сметы" }))
      return
    }

    if (dialogState.estimate) {
      setData((current) =>
        current.map((estimate) =>
          estimate.id === dialogState.estimate?.id ? { ...estimate, name } : estimate
        )
      )
      closeDialog()
      return
    }

    setData((current) => [...current, createLocalEstimate(name, current)])
    closeDialog()
  }

  return (
    <>
      <Tabs defaultValue="estimates" className="w-full flex-col justify-start gap-6">
        <div className="flex items-center justify-between px-4 lg:px-6">
          <TabsList className="**:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1">
            <TabsTrigger value="estimates">Сметы</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={openCreateDialog}>
            Создать смету
          </Button>
        </div>

        <TabsContent value="estimates" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      Сметы не найдены.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between px-4 text-sm text-muted-foreground">
            <div>Всего смет: {table.getFilteredRowModel().rows.length}</div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Назад
              </Button>
              <div className="text-sm font-medium text-foreground">
                {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Далее
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <EstimateNameDialog
        state={dialogState}
        onOpenChange={handleDialogOpenChange}
        onNameChange={handleDialogNameChange}
        onSubmit={handleDialogSubmit}
      />
    </>
  )
}
