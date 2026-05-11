"use client"

import React, { useState } from "react"
import { LockKey } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

import type { AccessRole, PermissionKey } from "../types"
import {
  accessRoles,
  defaultPermissionMatrix,
  permissionGroups,
  permissions,
} from "../__mocks__/permissions"

export function PermissionsMatrix() {
  const [matrix, setMatrix] =
    useState<Record<AccessRole, PermissionKey[]>>(defaultPermissionMatrix)

  function togglePermission(role: AccessRole, key: PermissionKey) {
    setMatrix((prev) => {
      const current = prev[role]
      const updated = current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key]
      return { ...prev, [role]: updated }
    })
  }

  function resetMatrix() {
    setMatrix(defaultPermissionMatrix)
  }

  return (
    <Card className="overflow-x-auto">
      <CardHeader>
        <CardTitle>Матрица прав доступа</CardTitle>
        <CardDescription>
          Настройка доступов по ролям. Владелец имеет полный набор прав и не
          может быть изменён.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                  (p) => p.group === group.id
                )
                return (
                  <React.Fragment key={group.id}>
                    <TableRow className="bg-muted/50">
                      <TableCell
                        colSpan={accessRoles.length + 1}
                        className="font-medium text-xs"
                      >
                        {group.label}
                      </TableCell>
                    </TableRow>
                    {permissionsInGroup.map((perm) => (
                      <TableRow key={perm.key}>
                        <TableCell className="text-xs text-muted-foreground">
                          {perm.label}
                        </TableCell>
                        {accessRoles.map((role) => (
                          <TableCell key={role.id} className="text-center">
                            <Checkbox
                              checked={matrix[role.id]?.includes(perm.key)}
                              disabled={role.locked}
                              onCheckedChange={() =>
                                togglePermission(role.id, perm.key)
                              }
                              aria-label={`${role.label}: ${perm.label}`}
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
        <div className="flex items-center justify-between mt-4">
          <Button variant="outline" size="sm" onClick={resetMatrix}>
            Сбросить
          </Button>
          <Button size="sm" onClick={() => console.log("save", matrix)}>
            Сохранить
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
