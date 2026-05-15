export const DIRECTORY_MATERIALS_CREATE_EVENT = "directory-materials:create"
export const DIRECTORY_MATERIALS_IMPORT_EVENT = "directory-materials:import"

export function dispatchDirectoryMaterialsCreateEvent() {
  window.dispatchEvent(new CustomEvent(DIRECTORY_MATERIALS_CREATE_EVENT))
}

export function dispatchDirectoryMaterialsImportEvent() {
  window.dispatchEvent(new CustomEvent(DIRECTORY_MATERIALS_IMPORT_EVENT))
}
