import { Button } from "@/components/ui/button"
import type { DirectoryWork } from "@/features/directory-works/types"
import { ArchiveIcon, PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react"
import { DirectoryWorksCode } from "./directory-works-code"
import { DirectoryWorksMetricGroup } from "./directory-works-metric-group"
import { DirectoryWorksName } from "./directory-works-name"
import { DirectoryWorksValue } from "./directory-works-value"

export function DirectoryWorksRow({
  row,
  saving,
  onArchive,
  onEdit,
  onInsertAfter,
}: {
  row: DirectoryWork
  saving: boolean
  onArchive: (row: DirectoryWork) => void
  onEdit: (row: DirectoryWork) => void
  onInsertAfter: (row: DirectoryWork) => void
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="m-3 grid gap-3 rounded-md border border-border p-3 transition-colors hover:bg-muted/50 xl:grid-cols-[minmax(420px,1fr)_minmax(480px,0.85fr)]">
        <div className="grid min-w-0 gap-3 rounded-md border border-border p-2 sm:grid-cols-[minmax(112px,0.28fr)_minmax(0,1fr)]">
          <DirectoryWorksCode value={row.code} />
          <DirectoryWorksName value={row.title} />
        </div>

        <div className="grid min-w-0 gap-1.5 rounded-md border border-border p-1.5 md:grid-cols-[minmax(220px,0.85fr)_minmax(180px,1fr)_auto]">
          <DirectoryWorksMetricGroup title="Ед. изм / Расценка">
            <DirectoryWorksValue label="Ед." value={row.unit} />
            <DirectoryWorksValue
              label="Цена"
              strong
              value={`${row.rate.toLocaleString("ru-RU")} ₽`}
            />
          </DirectoryWorksMetricGroup>

          <DirectoryWorksMetricGroup title="Категория">
            <DirectoryWorksValue label="Кат." value={row.category} />
          </DirectoryWorksMetricGroup>

          <div className="flex items-center justify-end gap-1 rounded-md border border-border p-2">
            <Button
              aria-label={`Добавить работу ниже ${row.title}`}
              disabled={saving}
              onClick={() => onInsertAfter(row)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <PlusIcon />
            </Button>
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
