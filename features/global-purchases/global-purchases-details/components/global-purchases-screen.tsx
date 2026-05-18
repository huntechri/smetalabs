"use client"

import { Suspense } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchGlobalPurchaseSupplierOptions } from "@/features/global-purchases/api/global-purchases-client"
import { fetchProjects } from "@/features/projects/api/projects-client"
import { projectsQueryKeys } from "@/features/projects/api/projects-query-keys"
import { GlobalPurchasesToolbar } from "./global-purchases-toolbar"
import { GlobalPurchasesView } from "./global-purchases-view"

export function GlobalPurchasesScreen() {
  const projectsQuery = useQuery({
    queryKey: projectsQueryKeys.list({ status: "all", limit: 100, sort: "title_asc" }),
    queryFn: () => fetchProjects({ status: "all", limit: 100, sort: "title_asc" }),
    staleTime: 30_000,
  })
  const suppliersQuery = useQuery({
    queryKey: ["global-purchases", "supplier-options"],
    queryFn: fetchGlobalPurchaseSupplierOptions,
    staleTime: 30_000,
  })

  const projects = projectsQuery.data?.data ?? []
  const suppliers = suppliersQuery.data?.data ?? []

  return (
    <>
      <Suspense fallback={null}>
        <GlobalPurchasesToolbar projects={projects} />
      </Suspense>
      <GlobalPurchasesView
        projects={projects}
        projectsLoading={projectsQuery.isLoading}
        suppliers={suppliers}
        suppliersLoading={suppliersQuery.isLoading}
      />
    </>
  )
}
