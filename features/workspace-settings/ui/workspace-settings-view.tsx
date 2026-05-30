"use client"

import { WorkspaceOverviewCard } from "./workspace-overview-card"
import { WorkspaceMembersTable } from "./workspace-members-table"
import { InviteMemberCard } from "./invite-member-card"
import { InviteLinkCard } from "./invite-link-card"
import { AllowedDomainsCard } from "./allowed-domains-card"
import { PendingInvitationsTable } from "./pending-invitations-table"
import { WorkspaceRolesSummaryCard } from "./workspace-roles-summary-card"
import { WorkspaceActionsCard } from "./workspace-actions-card"

export function WorkspaceSettingsView() {
  return (
    <div className="flex flex-col gap-6">
      {/* 1. Workspace Overview */}
      <WorkspaceOverviewCard />

      {/* 2. Members Table */}
      <WorkspaceMembersTable />

      {/* 3. Invite Member */}
      <InviteMemberCard />

      {/* 4. Invite Link */}
      <InviteLinkCard />

      {/* 5. Allowed Domains */}
      <AllowedDomainsCard />

      {/* 6. Pending Invitations */}
      <PendingInvitationsTable />

      {/* 7. Roles Summary */}
      <WorkspaceRolesSummaryCard />

      {/* 8. Workspace Actions */}
      <WorkspaceActionsCard />
    </div>
  )
}
