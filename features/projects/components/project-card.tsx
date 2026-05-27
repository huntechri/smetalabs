import Link from "next/link"
import type { ProjectRow } from "@/types/project"
import {
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
import { formatMoney, formatDateRange } from "@/lib/formatters"

interface ProjectCardProps {
  project: ProjectRow
  disabled?: boolean
  onEdit: (project: ProjectRow) => void
  onArchive: (project: ProjectRow) => void
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


export function ProjectCard({
  project,
  disabled,
  onEdit,
  onArchive,
}: ProjectCardProps) {
  const statusCfg = STATUS_CONFIG[project.status]

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
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

        <CardTitle>{project.title}</CardTitle>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <BuildingApartment className="size-3 shrink-0" />
          <span>{project.customerName ?? "Заказчик не указан"}</span>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3 shrink-0" />
          <span>{project.address ?? "Адрес не указан"}</span>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid min-w-0 grid-cols-1 gap-3 @xs:grid-cols-2">
          <div className="min-w-0 rounded-lg border bg-background p-3">
            <div className="flex w-full flex-col">
              <div className="mb-1 flex items-center gap-1 text-[0.625rem] text-muted-foreground">
                <CurrencyRub className="size-3 shrink-0" />
                <span>Бюджет</span>
              </div>
              <div className="w-full truncate text-xs font-medium">
                {project.budgetAmount !== null ? formatMoney(project.budgetAmount) : "Бюджет не указан"}
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-lg border bg-background p-3">
            <div className="flex w-full flex-col">
              <div className="mb-1 flex items-center gap-1 text-[0.625rem] text-muted-foreground">
                <CalendarBlank className="size-3 shrink-0" />
                <span>Сроки</span>
              </div>
              <div className="w-full truncate text-xs font-medium">
                {formatDateRange(project.startDate, project.endDate)}
              </div>
            </div>
          </div>

          <div className="col-span-1 min-w-0 rounded-lg border bg-background p-3 @xs:col-span-2">
            <div className="flex w-full flex-col">
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
        </div>
      </CardContent>

      <Separator />

      <CardFooter>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="xs" variant="outline">
            <Link href={`/projects/${project.id}`}>Открыть</Link>
          </Button>
          <Button
            disabled={disabled}
            variant="outline"
            size="xs"
            onClick={() => onEdit(project)}
          >
            <NotePencil data-icon="inline-start" />
            Ред.
          </Button>
          <Button
            disabled={disabled}
            variant="destructive"
            size="xs"
            onClick={() => onArchive(project)}
          >
            <Trash data-icon="inline-start" />
            Архивировать
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
