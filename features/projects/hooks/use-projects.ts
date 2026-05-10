import { projectsMock } from "@/features/projects/__mocks__/projects"

export function useProjects() {
  return { projects: projectsMock }
}
