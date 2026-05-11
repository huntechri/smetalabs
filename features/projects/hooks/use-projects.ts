import { useMemo, useState } from "react"
import { projectsMock } from "@/features/projects/__mocks__/projects"
import type { ProjectStatus } from "@/types/project"

export function useProjects() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<ProjectStatus[]>([])

  const filteredProjects = useMemo(() => {
    const query = search.toLowerCase().trim()

    return projectsMock.filter((project) => {
      const matchesSearch =
        !query ||
        project.title.toLowerCase().includes(query) ||
        project.customer.toLowerCase().includes(query)

      const matchesStatus =
        statusFilter.length === 0 || statusFilter.includes(project.status)

      return matchesSearch && matchesStatus
    })
  }, [search, statusFilter])

  return {
    projects: projectsMock,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    filteredProjects,
  }
}
