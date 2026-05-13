"use client"

import React from "react"
import { LockKey } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { Role } from "@/types/roles"
import type {
  PermissionDefinition,
  PermissionKey,
  RoleDefinition,
} from "../types"
import type { PermissionGroupDefinition } from "../lib/permission-groups"

type PermissionsMatrixTableProps = {
  accessRoles: RoleDefinition[]
  permissionGroups: PermissionGroupDefinition[]
  permissions: PermissionDefinition[]
  matrix: Record<Role, PermissionKey[]>
  onTogglePermission: (role: Role, key: PermissionKey) => void
}

export function PermissionsMatrixTable({
  accessRoles,
  permissionGroups,
  permissions,
  matrix,
  onTogglePermission,
}: PermissionsMatrixTableProps) {
  return (
    <Table className="min-w-[800px]">
      <TableHeader>
        <TableRow>
          <TableHead className="w-48">Права</TableHead>
          {accessRoles.map((role) => (
            <TableHead key={role.id} className="text-center">
              <Badge
                variant={role.locked ? "secondary" : "default"}
                className={cn(
                  role.locked && "opacity-60",
                  "inline-flex items-center gap-1"
                )}
              >
                {role.locked && <LockKey />}
                {role.label}
              </Badge>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {permissionGroups.map((group) => {
          const permissionsInGroup = permissions.filter(
            (permission) => permission.group === group.id
          )
          return (
            <React.Fragment key={group.id}>
              <TableRow className="bg-muted/50">
                <TableCell
                  colSpan={accessRoles.length + 1}
                  className="text-xs font-medium"
                >
                  {group.label}
                </TableCell>
              </TableRow>
              {permissionsInGroup.map((permission) => (
                <TableRow key={permission.key}>
                  <TableCell className="text-xs text-muted-foreground">
                    {permission.label}
                  </TableCell>
                  {accessRoles.map((role) => (
                    <TableCell key={role.id} className="text-center">
                      <Checkbox
                        checked={matrix[role.id]?.includes(permission.key)}
                        disabled={role.locked}
                        onCheckedChange={() =>
                          onTogglePermission(role.id, permission.key)
                        }
                        aria-label={`${role.label}: ${permission.label}`}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </React.Fragment>
          )
        })}
      </TableBody>
    </Table>
  )
}
