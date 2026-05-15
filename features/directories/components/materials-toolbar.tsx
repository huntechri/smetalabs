"use client"

import { Suspense } from "react"
import { DirectoriesToolbar } from "@/features/directories/components/directories-toolbar"
import { dispatchDirectoryMaterialsCreateEvent } from "@/features/directory-materials/lib/directory-materials-events"
import { PlusIcon, FileArrowDownIcon, ExportIcon } from "@phosphor-icons/react"

const materialsActions = [
  {
    label: "Добавить",
    icon: <PlusIcon data-icon="inline-start" />,
    onClick: dispatchDirectoryMaterialsCreateEvent,
  },
  {
    label: "Импорт",
    icon: <FileArrowDownIcon data-icon="inline-start" />,
    disabled: true,
    title: "Импорт материалов будет подключён позже",
  },
  {
    label: "Экспорт",
    icon: <ExportIcon data-icon="inline-start" />,
    disabled: true,
    title: "Экспорт материалов будет подключён позже",
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
