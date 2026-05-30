"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { STATUS_LABELS, type WorkspaceMember } from "../../model/workspace-settings-model"

export function WorkspaceMemberStatusBadge({
  status,
}: {
  status: WorkspaceMember["status"]
}) {
  const variants: Record<
    WorkspaceMember["status"],
    "default" | "secondary" | "outline"
  > = {
    active: "default",
    invited: "secondary",
    suspended: "outline",
  }
  const colors: Record<WorkspaceMember["status"], string> = {
    active: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10",
    invited: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/10",
    suspended: "bg-destructive/10 text-destructive hover:bg-destructive/10",
  }

  return (
    <Badge
      variant={variants[status]}
      className={cn("font-normal", colors[status])}
    >
      {STATUS_LABELS[status]}
    </Badge>
  )
}
