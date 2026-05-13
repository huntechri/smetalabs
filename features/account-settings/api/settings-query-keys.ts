export const settingsQueryKeys = {
  all: ["settings"] as const,
  account: () => [...settingsQueryKeys.all, "account"] as const,
}
