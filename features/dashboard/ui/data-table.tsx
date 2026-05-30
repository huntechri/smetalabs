"use client"

import * as React from "react"
import Link from "next/link"
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table"
import {
  CaretLeft,
  CaretRight,
  ArrowSquareOut,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useActiveProjects } from "../application/use-active-projects"
import { formatDateRange } from "../model/dashboard-model"
import type { ProjectRow } from "@/types/project"
import { Skeleton } from "@/components/ui/skeleton"

const columns: ColumnDef<ProjectRow>[] = [
  {
    accessorKey: "title",
    header: "Название проекта",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-medium">
        <Link
          href={`/projects/${row.original.id}`}
          className="hover:underline text-foreground"
        >
          {row.original.title}
        </Link>
      </div>
    ),
  },
  {
    accessorKey: "address",
    header: "Адрес",
    cell: ({ row }) => (
      <div className="text-muted-foreground truncate max-w-[250px]" title={row.original.address ?? ""}>
        {row.original.address ?? "—"}
      </div>
    ),
  },
  {
    id: "dates",
    header: "Сроки",
    cell: ({ row }) => (
      <div className="text-muted-foreground whitespace-nowrap">
        {formatDateRange(row.original.startDate, row.original.endDate)}
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-end">
        <Button asChild variant="ghost" size="icon" className="size-8">
          <Link href={`/projects/${row.original.id}`} title="Открыть проект">
            <ArrowSquareOut className="size-4 text-muted-foreground" />
          </Link>
        </Button>
      </div>
    ),
  },
]

export function DataTable() {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const { projects, loading: isLoading, error } = useActiveProjects()

  const table = useReactTable({
    data: projects,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="overflow-hidden rounded-lg border">
          <div className="p-8 flex flex-col gap-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 lg:px-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Не удалось загрузить список проектов в работе: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Проекты в работе</h3>
      </div>
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-9">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
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
                    <TableCell key={cell.id} className="py-2.5">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  Нет активных проектов в работе.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-xs text-muted-foreground">
            Показано {table.getRowModel().rows.length} из {projects.length} проектов
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <CaretLeft className="size-4" />
              <span className="sr-only">Предыдущая страница</span>
            </Button>
            <span className="text-xs font-medium">
              Страница {table.getState().pagination.pageIndex + 1} из{" "}
              {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <CaretRight className="size-4" />
              <span className="sr-only">Следующая страница</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
