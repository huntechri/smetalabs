"use client"

import { Suspense } from "react"
import { DirectoriesToolbar } from "@/features/directories/components/directories-toolbar"
import { dispatchDirectoryWorksCreateEvent } from "@/features/directory-works/lib/directory-works-events"
import { PlusIcon, FileArrowDownIcon, ExportIcon } from "@phosphor-icons/react"

const worksActions = [
  {
    label: "Добавить",
    icon: <PlusIcon data-icon="inline-start" />,
    onClick: dispatchDirectoryWorksCreateEvent,
  },
  {
    label: "Импорт",
    icon: <FileArrowDownIcon data-icon="inline-start" />,
    disabled: true,
    title: "Импорт будет реализован в issue #69",
  },
  {
    label: "Экспорт",
    icon: <ExportIcon data-icon="inline-start" />,
    disabled: true,
    title: "Экспорт будет реализован в issue #69",
  },
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
