"use client"

import { Suspense } from "react"
import { DirectoriesToolbar } from "@/features/directories/components/directories-toolbar"
import { DIRECTORY_SUPPLIERS_CREATE_EVENT } from "@/features/directory-suppliers/lib/directory-suppliers-events"
import { PlusIcon } from "@phosphor-icons/react"

export function SuppliersToolbar() {
  const suppliersActions = [
    {
      label: "Добавить",
      icon: <PlusIcon data-icon="inline-start" />,
      onClick: () => window.dispatchEvent(new Event(DIRECTORY_SUPPLIERS_CREATE_EVENT)),
    },
  ]

  return (
    <Suspense fallback={null}>
      <DirectoriesToolbar
        searchPlaceholder="Поиск поставщиков"
        searchAriaLabel="Поиск поставщиков"
        actions={suppliersActions}
      />
    </Suspense>
  )
}
