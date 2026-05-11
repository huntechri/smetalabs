"use client"

import type { ProjectRow } from "@/types/project"
import {
  ArrowSquareOut,
  BuildingApartment,
  CalendarBlank,
  CurrencyRub,
  MapPin,
  NotePencil,
  Trash,
} from "@phosphor-icons/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface ProjectCardProps {
  project: ProjectRow
}

const STATUS_CONFIG: Record<
  ProjectRow["status"],
  {
    label: string
    dotClass: string
    badgeVariant: "default" | "secondary"
    badgeClassName?: string
  }
> = {
  new: {
    label: "Новый",
    dotClass: "bg-blue-500",
    badgeVariant: "default",
    badgeClassName:
      "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  in_progress: {
    label: "В работе",
    dotClass: "bg-emerald-500",
    badgeVariant: "default",
  },
  completed: {
    label: "Завершён",
    dotClass: "bg-slate-400",
    badgeVariant: "secondary",
  },
}

function formatMoney(value: number): string {
  return value.toLocaleString("ru-RU") + " ₽"
}

function formatDateRange(start?: string, end?: string): string {
  if (!start && !end) return "Сроки не указаны"
  if (start && end) return `${start} – ${end}`
  return start || end || ""
}

export function ProjectCard({ project }: ProjectCardProps) {
  const statusCfg = STATUS_CONFIG[project.status]

  return (
    <Card className="border-dashed border-amber-500">
      <CardHeader>
        {/* Status badges row */}
        <div className="flex flex-row items-center gap-2 rounded-md border border-dashed border-green-400 p-1.5">
          {/* Status badge with dot */}
          <Badge
            variant={statusCfg.badgeVariant}
            className={statusCfg.badgeClassName}
          >
            <span
              className={`inline-block size-1.5 rounded-full ${statusCfg.dotClass}`}
            />
            {statusCfg.label}
          </Badge>

        </div>

        {/* Title */}
        <div className="rounded-md border border-dashed border-green-300 p-2">
          <CardTitle>{project.title}</CardTitle>
        </div>

        {/* Customer + Address */}
        <div className="flex flex-col gap-1 rounded-md border border-dashed border-green-300 p-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <BuildingApartment className="size-3 shrink-0" />
            <span>{project.customer}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            <span>{project.address ?? "Адрес не указан"}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-3 gap-3 rounded-md border border-dashed border-blue-400 p-2">
          {/* Budget block */}
          <div className="rounded-lg border border-dashed border-amber-500 p-3">
            <div className="mb-1 flex items-center gap-1 text-[0.625rem] text-muted-foreground">
              <CurrencyRub className="size-3 shrink-0" />
              <span>Бюджет</span>
            </div>
            <div className="text-xs font-medium">
              {formatMoney(project.budget)}
            </div>
          </div>

          {/* Dates block */}
          <div className="rounded-lg border border-dashed border-amber-500 p-3">
            <div className="mb-1 flex items-center gap-1 text-[0.625rem] text-muted-foreground">
              <CalendarBlank className="size-3 shrink-0" />
              <span>Сроки</span>
            </div>
            <div className="text-xs font-medium">
              {formatDateRange(project.startDate, project.endDate)}
            </div>
          </div>

          {/* Progress block */}
          <div className="rounded-lg border border-dashed border-amber-500 p-3">
            <div className="mb-1 text-[0.625rem] text-muted-foreground">
              Прогресс
            </div>
            <div className="mb-1.5 text-xs font-medium">
              {project.progress}%
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>

      <Separator />

      <CardFooter>
        <div className="flex gap-2 rounded-md border border-dashed border-purple-400 p-1.5">
          <Button variant="outline" size="xs">
            <ArrowSquareOut data-icon="inline-start" />
            Открыть
          </Button>
          <Button variant="outline" size="xs">
            <NotePencil data-icon="inline-start" />
            Ред.
          </Button>
          <Button variant="destructive" size="xs">
            <Trash data-icon="inline-start" />
            Удалить
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
