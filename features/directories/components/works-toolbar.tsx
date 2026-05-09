"use client"

import { Suspense } from "react"
import { DirectoriesToolbar } from "@/features/directories/components/directories-toolbar"
import { PlusIcon, FileArrowDownIcon, ExportIcon } from "@phosphor-icons/react"

const worksActions = [
  { label: "Добавить", icon: <PlusIcon data-icon="inline-start" /> },
  { label: "Импорт", icon: <FileArrowDownIcon data-icon="inline-start" /> },
  { label: "Экспорт", icon: <ExportIcon data-icon="inline-start" /> },
]

export function WorksToolbar() {
  return (
    <Suspense fallback={null}>
      <DirectoriesToolbar
        searchPlaceholder="Поиск работ"
        searchAriaLabel="Поиск работ"
        actions={worksActions}
      />
    </Suspense>
  )
}
