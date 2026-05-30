"use client"

import { useMemo } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { buildPermissionMatrix } from "../model/access-control-model"
import { useRoles } from "../application/use-access-control"
import { usePermissionMatrixState } from "../application/use-permission-matrix-state"
import { PermissionsMatrixError } from "./permissions-matrix-error"
import { PermissionsMatrixSkeleton } from "./permissions-matrix-skeleton"
import { PermissionsMatrixTable } from "./permissions-matrix-table"
import { PermissionsMatrixToolbar } from "./permissions-matrix-toolbar"

export function PermissionsMatrix() {
  const { roles, loading, error, refetch } = useRoles()
  const derived = useMemo(() => buildPermissionMatrix(roles), [roles])
  const { matrix, togglePermission, resetMatrix } = usePermissionMatrixState(
    derived.initialMatrix
  )

  if (loading) {
    return <PermissionsMatrixSkeleton />
  }

  if (error) {
    return <PermissionsMatrixError error={error} onRetry={refetch} />
  }

  if (!derived.accessRoles.length) {
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
        <PermissionsMatrixTable
          accessRoles={derived.accessRoles}
          permissionGroups={derived.permissionGroups}
          permissions={derived.permissions}
          matrix={matrix}
          onTogglePermission={togglePermission}
        />
        <PermissionsMatrixToolbar onReset={resetMatrix} />
      </CardContent>
    </Card>
  )
}
