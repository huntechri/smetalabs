import { PermissionsMatrix } from "@/features/access-control/components/permissions-matrix"

export default function TeamPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="scrollbar-subtle @container/main flex flex-1 flex-col gap-4 p-4 md:p-6 min-h-0 overflow-y-auto">
        <PermissionsMatrix />
      </div>
    </div>
  )
}
