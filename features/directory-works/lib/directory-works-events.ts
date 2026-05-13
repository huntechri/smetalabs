export const DIRECTORY_WORKS_CREATE_EVENT = "directory-works:create"
export const DIRECTORY_WORKS_IMPORT_EVENT = "directory-works:import"
export const DIRECTORY_WORKS_EXPORT_EVENT = "directory-works:export"

export function dispatchDirectoryWorksCreateEvent() {
  window.dispatchEvent(new CustomEvent(DIRECTORY_WORKS_CREATE_EVENT))
}

export function dispatchDirectoryWorksImportEvent() {
  window.dispatchEvent(new CustomEvent(DIRECTORY_WORKS_IMPORT_EVENT))
}

export function dispatchDirectoryWorksExportEvent() {
  window.dispatchEvent(new CustomEvent(DIRECTORY_WORKS_EXPORT_EVENT))
}
