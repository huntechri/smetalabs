import { AccountSettingsView } from "@/features/account-settings/ui/account-settings-view"

export default function AccountSettingsPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="scrollbar-subtle @container/main flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">
            Настройки аккаунта
          </h1>
          <p className="text-sm text-muted-foreground">
            Управление личным профилем и рабочим пространством
          </p>
        </div>
        <AccountSettingsView />
      </div>
    </div>
  )
}
