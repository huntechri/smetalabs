"use client"

import { Suspense } from "react"
import { DirectoriesToolbar } from "@/features/directories/components/directories-toolbar"
import {
  dispatchDirectoryMaterialsCreateEvent,
  dispatchDirectoryMaterialsImportEvent,
} from "@/features/directory-materials/lib/directory-materials-events"
import { PlusIcon, FileArrowDownIcon, ExportIcon } from "@phosphor-icons/react"

function exportDirectoryMaterials() {
  const searchParams = new URLSearchParams(window.location.search)
  searchParams.set("format", "csv")
  searchParams.delete("cursor")
  window.location.href = `/api/directory-materials/export?${searchParams.toString()}`
}

const materialsActions = [
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

export function MaterialsToolbar() {
  return (
    <Suspense fallback={null}>
      <DirectoriesToolbar
        searchPlaceholder="Поиск материалов"
        searchAriaLabel="Поиск материалов"
        actions={materialsActions}
      />
    </Suspense>
  )
}
