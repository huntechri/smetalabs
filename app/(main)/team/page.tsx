import { TeamManagementView } from "@/features/workspace-settings/components/team-management-view"

export default function TeamPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
        <TeamManagementView />
      </div>
    </div>
  )
}
