"use client"

import type { Role } from "@/types/roles"
import type { PermissionKey } from "../model/access-control-model"

export function useUpdatePermissionMatrix() {
  async function updatePermissionMatrix(
    _matrix: Record<Role, PermissionKey[]>
  ) {
    void _matrix
    throw new Error("Сохранение матрицы прав пока не подключено")
  }

  return {
    updatePermissionMatrix,
    loading: false,
    error: null as string | null,
  }
}
