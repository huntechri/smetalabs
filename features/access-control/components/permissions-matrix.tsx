"use client"

import React, { useMemo, useState } from "react"
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
import { Skeleton } from "@/components/ui/skeleton"
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
import type { PermissionKey } from "../types"
import { useRoles } from "../hooks/use-access-control"

// ── Russian group labels (API returns English groupName) ──

const GROUP_LABELS: Record<string, string> = {
  projects: "Проекты",
  estimates: "Сметы",
  purchases: "Закупки",
  team: "Команда",
  billing: "Биллинг",
}

export function PermissionsMatrix() {
  const { roles, loading, error } = useRoles()

  // Build derived data from API response
  const { accessRoles, permissionGroups, permissions, initialMatrix } =
    useMemo(() => {
      if (!roles.length) {
        return {
          accessRoles: [],
          permissionGroups: [],
          permissions: [],
          initialMatrix: {} as Record<Role, PermissionKey[]>,
        }
      }

      // Access roles from API: id, name, label, locked
      const accessRoles = roles.map((r) => ({
        id: r.name,
        label: r.label,
        locked: r.locked,
      }))

      // Collect unique permissions across all roles
      const permMap = new Map<string, { key: PermissionKey; label: string; group: string }>()
      for (const role of roles) {
        for (const p of role.permissions) {
          if (!permMap.has(p.key)) {
            permMap.set(p.key, {
              key: p.key as PermissionKey,
              label: p.label,
              group: p.groupName,
            })
          }
        }
      }
      const permissions = Array.from(permMap.values())

      // Unique groups sorted
      const groupNames = Array.from(new Set(permissions.map((p) => p.group)))
      const permissionGroups = groupNames.map((g) => ({
        id: g,
        label: GROUP_LABELS[g] ?? g,
      }))

      // Initial matrix: which permissions each role has
      const initialMatrix = {} as Record<Role, PermissionKey[]>
      for (const role of roles) {
        initialMatrix[role.name] = role.permissions.map((p) => p.key as PermissionKey)
      }

      return { accessRoles, permissionGroups, permissions, initialMatrix }
    }, [roles])

  const [matrix, setMatrix] =
    useState<Record<Role, PermissionKey[]>>(initialMatrix)

  // Sync matrix when roles load
  React.useEffect(() => {
    if (Object.keys(initialMatrix).length > 0) {
      setMatrix(initialMatrix)
    }
  }, [initialMatrix])

  function togglePermission(role: Role, key: PermissionKey) {
    setMatrix((prev) => {
      const current = prev[role]
      const updated = current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key]
      return { ...prev, [role]: updated }
    })
  }

  function resetMatrix() {
    setMatrix(initialMatrix)
  }

  // ── Loading skeleton ──
  if (loading) {
    return (
      <Card className="overflow-auto">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Error state ──
  if (error) {
    return (
      <Card className="overflow-auto border-destructive/30">
        <CardHeader>
          <CardTitle>Матрица прав доступа</CardTitle>
          <CardDescription className="text-destructive">
            Не удалось загрузить данные: {error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Попробовать снова
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ── Empty state ──
  if (!accessRoles.length) {
    return (
      <Card className="overflow-auto">
        <CardHeader>
          <CardTitle>Матрица прав доступа</CardTitle>
          <CardDescription>
            Нет данных о ролях. Настройте роли в панели управления.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="overflow-auto">
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
