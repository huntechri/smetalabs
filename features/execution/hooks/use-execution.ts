import { useState } from "react"
import { executionRows as mockRows } from "@/features/execution/__mocks__/execution"
import type { ExecutionRow } from "@/types/execution"

export function useExecution() {
  const [executions, setExecutions] = useState(mockRows)

  const updateExecution = (id: string, updates: Partial<ExecutionRow>) => {
    setExecutions((current) =>
      current.map((row) => (row.id === id ? { ...row, ...updates } : row))
    )
  }

  return { executions, updateExecution }
}
