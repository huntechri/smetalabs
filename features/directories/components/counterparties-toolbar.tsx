"use client"

import { Suspense, useState } from "react"
import { DirectoriesToolbar } from "@/features/directories/components/directories-toolbar"
import { DirectoryCounterpartiesCreateDialog } from "@/features/directory-counterparties/directory-counterparties-details/components/directory-counterparties-create-dialog"
import { PlusIcon } from "@phosphor-icons/react"

export function CounterpartiesToolbar() {
  const [dialogOpen, setDialogOpen] = useState(false)

  const counterpartiesActions = [
    {
      label: "Добавить",
      icon: <PlusIcon data-icon="inline-start" />,
      onClick: () => setDialogOpen(true),
    },
  ]

  return (
    <Suspense fallback={null}>
      <DirectoriesToolbar
        searchPlaceholder="Поиск контрагентов"
        searchAriaLabel="Поиск контрагентов"
        actions={counterpartiesActions}
      />
      <DirectoryCounterpartiesCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Suspense>
  )
}
