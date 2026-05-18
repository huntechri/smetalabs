export const GLOBAL_PURCHASES_CREATE_EVENT = "global-purchases:create"

export function dispatchGlobalPurchasesCreateEvent() {
  window.dispatchEvent(new CustomEvent(GLOBAL_PURCHASES_CREATE_EVENT))
}
