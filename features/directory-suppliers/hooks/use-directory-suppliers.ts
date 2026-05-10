import { directorySupplierRows } from "@/features/directory-suppliers/__mocks__/directory-suppliers"

export function useDirectorySuppliers() {
  return { suppliers: directorySupplierRows }
}
