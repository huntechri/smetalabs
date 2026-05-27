"use client"

import { Suspense } from "react"
import { useGlobalPurchasesProjects } from "@/features/global-purchases/hooks/use-global-purchases-projects"
import { GlobalPurchasesToolbar } from "./global-purchases-toolbar"
import { GlobalPurchasesView } from "./global-purchases-view"

export function GlobalPurchasesScreen() {
  const { projects, loading } = useGlobalPurchasesProjects()

  return (
    <>
      <Suspense fallback={null}>
        <GlobalPurchasesToolbar projects={projects} />
      </Suspense>
      <GlobalPurchasesView
        projects={projects}
        projectsLoading={loading}
      />
    </>
  )
}

