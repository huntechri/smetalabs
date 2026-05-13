"use client"

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { WorkspaceMember } from "../../types"
import type { MemberActions } from "./member-utils"
import { WorkspaceMemberRow } from "./workspace-member-row"

export function WorkspaceMembersTableView({
  members,
  actions,
}: {
  members: WorkspaceMember[]
  actions: MemberActions
}) {
  return (
    <div className="hidden sm:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Участник</TableHead>
            <TableHead>Роль</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead className="hidden md:table-cell">Активность</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <WorkspaceMemberRow
              key={member.id}
              member={member}
              actions={actions}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
