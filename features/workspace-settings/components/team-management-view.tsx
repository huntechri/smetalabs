"use client"

import { InviteMemberCard } from "./invite-member-card"
import { PendingInvitationsTable } from "./pending-invitations-table"
import { WorkspaceMembersTable } from "./workspace-members-table"
import { WorkspaceOverviewCard } from "./workspace-overview-card"
import { WorkspaceRolesSummaryCard } from "./workspace-roles-summary-card"

export function TeamManagementView() {
  return (
    <div className="flex flex-col gap-6">
      {/* Concise workspace/team summary */}
      <WorkspaceOverviewCard />

      {/* Team membership and role management */}
      <WorkspaceMembersTable />

      {/* Production-ready manual invite flow */}
      <InviteMemberCard />

      {/* Pending invite management */}
      <PendingInvitationsTable />

      {/* Role reference */}
      <WorkspaceRolesSummaryCard />
    </div>
  )
}
