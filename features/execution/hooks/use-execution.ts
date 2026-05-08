import { executionRows } from "@/features/execution/__mocks__/execution"

export function useExecution() {
  return { executions: executionRows }
}
