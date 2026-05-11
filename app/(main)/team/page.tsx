import { WorkspaceSettingsView } from "@/features/workspace-settings/components/workspace-settings-view"

export default function TeamPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
        <WorkspaceSettingsView />
      </div>
    </div>
  )
}
