import { directoryCounterpartyRows } from "@/features/directory-counterparties/__mocks__/directory-counterparties"

export function useDirectoryCounterparties() {
  return { counterparties: directoryCounterpartyRows }
}
