"use client"

import { Suspense } from "react"
import { DirectoriesToolbar } from "@/features/directories/components/directories-toolbar"
import { DIRECTORY_COUNTERPARTIES_CREATE_EVENT } from "@/features/directory-counterparties/lib/directory-counterparties-events"
import { PlusIcon } from "@phosphor-icons/react"

export function CounterpartiesToolbar() {
  const counterpartiesActions = [
    {
      label: "Добавить",
      icon: <PlusIcon data-icon="inline-start" />,
      onClick: () => window.dispatchEvent(new Event(DIRECTORY_COUNTERPARTIES_CREATE_EVENT)),
    },
  ]

  return (
    <Suspense fallback={null}>
      <DirectoriesToolbar
        searchPlaceholder="Поиск контрагентов"
        searchAriaLabel="Поиск контрагентов"
        actions={counterpartiesActions}
      />
    </Suspense>
  )
}
