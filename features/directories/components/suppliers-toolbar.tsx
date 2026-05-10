"use client"

import { Suspense, useState } from "react"
import { DirectoriesToolbar } from "@/features/directories/components/directories-toolbar"
import { DirectorySuppliersCreateDialog } from "@/features/directory-suppliers/directory-suppliers-details/components/directory-suppliers-create-dialog"
import { PlusIcon } from "@phosphor-icons/react"

export function SuppliersToolbar() {
  const [dialogOpen, setDialogOpen] = useState(false)

  const suppliersActions = [
    {
      label: "Добавить",
      icon: <PlusIcon data-icon="inline-start" />,
    },
  ]

  return (
    <Suspense fallback={null}>
      <DirectoriesToolbar
        searchPlaceholder="Поиск поставщиков"
        searchAriaLabel="Поиск поставщиков"
        actions={suppliersActions}
      />
      <DirectorySuppliersCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Suspense>
  )
}
