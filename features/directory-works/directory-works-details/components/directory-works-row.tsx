import { Button } from "@/components/ui/button"
import type { DirectoryWork } from "@/features/directory-works/types"
import { ArchiveIcon, PencilSimpleIcon } from "@phosphor-icons/react"
import { DirectoryWorksName } from "./directory-works-name"
import { DirectoryWorksValue } from "./directory-works-value"
import { DirectoryWorksMetricGroup } from "./directory-works-metric-group"

export function DirectoryWorksRow({
  row,
  saving,
  onArchive,
  onEdit,
}: {
  row: DirectoryWork
  saving: boolean
  onArchive: (row: DirectoryWork) => void
  onEdit: (row: DirectoryWork) => void
}) {
  return (
    <div className="border-b border-dashed border-green-500 last:border-b-0">
      <div className="m-3 grid gap-3 rounded-md border border-dashed border-green-500 p-3 transition-colors hover:bg-muted/50 lg:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]">
        <div className="flex min-w-0 flex-col gap-3 rounded-md border border-dashed border-green-300 p-2">
          <DirectoryWorksName value={row.title} />
        </div>

        <div className="grid min-w-0 gap-1.5 rounded-md border border-dashed border-green-400 p-1.5 md:grid-cols-[minmax(190px,1fr)_minmax(190px,1fr)_minmax(80px,0.4fr)_auto]">
          <DirectoryWorksMetricGroup title="Ед. изм">
            <DirectoryWorksValue label="Ед." value={row.unit} />
          </DirectoryWorksMetricGroup>

          <DirectoryWorksMetricGroup title="Расценка">
            <DirectoryWorksValue
              label="Цена"
              strong
              value={`${row.rate.toLocaleString("ru-RU")} ₽`}
            />
          </DirectoryWorksMetricGroup>

          <DirectoryWorksMetricGroup title="Категория">
            <DirectoryWorksValue label="Кат." value={row.category} />
          </DirectoryWorksMetricGroup>

          <div className="flex items-center justify-end gap-1 rounded-md border border-dashed border-muted-foreground/30 p-2">
            <Button
              aria-label={`Редактировать ${row.title}`}
              disabled={saving}
              onClick={() => onEdit(row)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <PencilSimpleIcon />
            </Button>
            <Button
              aria-label={`Архивировать ${row.title}`}
              disabled={saving}
              onClick={() => onArchive(row)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <ArchiveIcon />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
