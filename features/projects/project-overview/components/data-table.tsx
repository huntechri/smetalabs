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
import { z } from "zod"

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

export const schema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string(),
  status: z.enum(["Новая", "В работе", "Завершено"]),
  amount: z.number(),
  createdAt: z.string(),
})

type EstimateRow = z.infer<typeof schema>

const estimatesData: EstimateRow[] = [
  {
    id: 1,
    name: "Смета на отделочные работы",
    type: "Основная",
    status: "Новая",
    amount: 1250000,
    createdAt: "2026-05-19",
  },
  {
    id: 2,
    name: "Смета на инженерные сети",
    type: "Дополнительная",
    status: "В работе",
    amount: 875000,
    createdAt: "2026-05-18",
  },
  {
    id: 3,
    name: "Смета на черновые материалы",
    type: "Основная",
    status: "Завершено",
    amount: 640000,
    createdAt: "2026-05-17",
  },
]

function formatMoney(value: number) {
  return value.toLocaleString("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  })
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU")
}

const columns: ColumnDef<EstimateRow>[] = [
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
        {formatMoney(row.original.amount)}
      </div>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Дата создания сметы",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDate(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-right">Действия</div>,
    cell: () => (
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
            <DropdownMenuItem>Редактировать</DropdownMenuItem>
            <DropdownMenuItem>Создать копию</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Удалить</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  },
]

export function DataTable({ data: _data }: { data: unknown[] }) {
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const table = useReactTable({
    data: estimatesData,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <Tabs defaultValue="estimates" className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <TabsList className="**:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1">
          <TabsTrigger value="estimates">Сметы</TabsTrigger>
        </TabsList>
        <Button variant="outline" size="sm">
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
  )
}
