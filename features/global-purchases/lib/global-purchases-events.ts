export const GLOBAL_PURCHASES_CREATE_EVENT = "global-purchases:create"
export const GLOBAL_PURCHASES_IMPORT_EVENT = "global-purchases:import"

export function dispatchGlobalPurchasesCreateEvent() {
  window.dispatchEvent(new CustomEvent(GLOBAL_PURCHASES_CREATE_EVENT))
}

export function dispatchGlobalPurchasesImportEvent() {
  window.dispatchEvent(new CustomEvent(GLOBAL_PURCHASES_IMPORT_EVENT))
}
