import { useState } from "react"
import { projectRows } from "@/features/projects/__mocks__/projects"
import type { Project } from "@/types/project"

export function useProjects() {
  const [projects, setProjects] = useState(projectRows)

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects((current) =>
      current.map((row) => (row.id === id ? { ...row, ...updates } : row))
    )
  }

  return { projects, updateProject }
}
