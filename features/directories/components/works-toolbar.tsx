"use client"

import { Suspense, useState } from "react"
import {
  DirectoriesToolbar,
  type DirectoryAction,
} from "@/features/directories/components/directories-toolbar"
import { DirectoryWorksCategoryFilter } from "@/features/directory-works/components/directory-works-category-filter"
import {
  dispatchDirectoryWorksCreateEvent,
  dispatchDirectoryWorksExportEvent,
  dispatchDirectoryWorksImportEvent,
} from "@/features/directory-works/lib/directory-works-events"
import {
  PlusIcon,
  FileArrowDownIcon,
  ExportIcon,
  FunnelIcon,
} from "@phosphor-icons/react"

function WorksToolbarContent() {
  const [filtersOpen, setFiltersOpen] = useState(false)

  const worksActions: DirectoryAction[] = [
    {
      label: "Фильтр",
      icon: <FunnelIcon data-icon="inline-start" />,
      variant: filtersOpen ? "default" : "outline",
      hideLabel: true,
      onClick: () => setFiltersOpen((current) => !current),
    },
    {
      label: "Добавить",
      icon: <PlusIcon data-icon="inline-start" />,
      onClick: dispatchDirectoryWorksCreateEvent,
    },
    {
      label: "Импорт",
      icon: <FileArrowDownIcon data-icon="inline-start" />,
      onClick: dispatchDirectoryWorksImportEvent,
    },
    {
      label: "Экспорт",
      icon: <ExportIcon data-icon="inline-start" />,
      onClick: dispatchDirectoryWorksExportEvent,
    },
  ]

  return (
    <DirectoriesToolbar
      searchPlaceholder="Поиск работ"
      searchAriaLabel="Поиск работ"
      actions={worksActions}
    >
      <DirectoryWorksCategoryFilter open={filtersOpen} />
    </DirectoriesToolbar>
  )
}

export function WorksToolbar() {
  return (
    <Suspense fallback={null}>
      <WorksToolbarContent />
    </Suspense>
  )
}
