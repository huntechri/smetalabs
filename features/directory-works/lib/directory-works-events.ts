export const DIRECTORY_WORKS_CREATE_EVENT = "directory-works:create"

export function dispatchDirectoryWorksCreateEvent() {
  window.dispatchEvent(new CustomEvent(DIRECTORY_WORKS_CREATE_EVENT))
}
