"use client"

import { Suspense } from "react"
import { DirectoriesToolbar } from "@/features/directories/components/directories-toolbar"
import { PlusIcon, FileArrowDownIcon, ExportIcon } from "@phosphor-icons/react"

const materialsActions = [
  { label: "Добавить", icon: <PlusIcon data-icon="inline-start" /> },
  { label: "Импорт", icon: <FileArrowDownIcon data-icon="inline-start" /> },
  { label: "Экспорт", icon: <ExportIcon data-icon="inline-start" /> },
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
