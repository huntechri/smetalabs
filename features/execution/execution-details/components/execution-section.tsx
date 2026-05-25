"use client"

import { useExecution } from "@/features/execution/hooks/use-execution"
import { ExecutionRow } from "./execution-row"

export function ExecutionSection() {
  const { executions, updateExecution } = useExecution()

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col gap-3 p-3">
        {executions.map((row) => (
          <ExecutionRow key={row.id} row={row} onUpdate={updateExecution} />
        ))}
      </div>
    </section>
  )
}
