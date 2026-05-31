"use client"

import { Suspense } from "react"
import { DirectoriesToolbar } from "./directories-toolbar"
import { DIRECTORY_SUPPLIERS_CREATE_EVENT } from "@/features/directory-suppliers/model/directory-suppliers-model"
import { PlusIcon } from "@phosphor-icons/react"

export function SuppliersToolbar() {
  const openCreateDialog = () => {
    globalThis.dispatchEvent(new CustomEvent(DIRECTORY_SUPPLIERS_CREATE_EVENT))
  }

  const suppliersActions = [
    {
      label: "Добавить",
      icon: <PlusIcon data-icon="inline-start" />,
      onClick: openCreateDialog,
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
