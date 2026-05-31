"use client"

import { Suspense, useState } from "react"
import { DirectoriesToolbar } from "./directories-toolbar"
import type { DirectoryAction } from "../model/directories-model"
import { DirectoryMaterialsCategoryFilter } from "@/features/directory-materials/components/directory-materials-category-filter"
import {
  dispatchDirectoryMaterialsCreateEvent,
  dispatchDirectoryMaterialsImportEvent,
} from "@/features/directory-materials/lib/directory-materials-events"
import {
  PlusIcon,
  FileArrowDownIcon,
  ExportIcon,
  FunnelIcon,
} from "@phosphor-icons/react"

function exportDirectoryMaterials() {
  const searchParams = new URLSearchParams(window.location.search)
  searchParams.set("format", "csv")
  searchParams.delete("cursor")
  window.location.href = `/api/directory-materials/export?${searchParams.toString()}`
}

function MaterialsToolbarContent() {
  const [filtersOpen, setFiltersOpen] = useState(false)

  const materialsActions: DirectoryAction[] = [
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
      onClick: dispatchDirectoryMaterialsCreateEvent,
    },
    {
      label: "Импорт",
      icon: <FileArrowDownIcon data-icon="inline-start" />,
      onClick: dispatchDirectoryMaterialsImportEvent,
      title: "Импорт материалов из CSV",
    },
    {
      label: "Экспорт",
      icon: <ExportIcon data-icon="inline-start" />,
      onClick: exportDirectoryMaterials,
      title: "Экспорт материалов в CSV",
    },
  ]

  return (
    <DirectoriesToolbar
      searchPlaceholder="Поиск материалов"
      searchAriaLabel="Поиск материалов"
      actions={materialsActions}
    >
      <DirectoryMaterialsCategoryFilter open={filtersOpen} />
    </DirectoriesToolbar>
  )
}

export function MaterialsToolbar() {
  return (
    <Suspense fallback={null}>
      <MaterialsToolbarContent />
    </Suspense>
  )
}
