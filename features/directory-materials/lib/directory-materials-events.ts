export const DIRECTORY_MATERIALS_CREATE_EVENT = "directory-materials:create"

export function dispatchDirectoryMaterialsCreateEvent() {
  window.dispatchEvent(new CustomEvent(DIRECTORY_MATERIALS_CREATE_EVENT))
}
