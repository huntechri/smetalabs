"use client"

import { useState } from "react"
import type { Role } from "@/types/roles"
import type { PermissionKey } from "../model/access-control-model"

type MatrixState = {
  source: Record<Role, PermissionKey[]>
  matrix: Record<Role, PermissionKey[]>
}

export function usePermissionMatrixState(
  initialMatrix: Record<Role, PermissionKey[]>
) {
  const [state, setState] = useState<MatrixState>({
    source: initialMatrix,
    matrix: initialMatrix,
  })
  const matrix = state.source === initialMatrix ? state.matrix : initialMatrix

  function togglePermission(role: Role, key: PermissionKey) {
    setState((prev) => {
      const baseMatrix =
        prev.source === initialMatrix ? prev.matrix : initialMatrix
      const current = baseMatrix[role] ?? []
      const updated = current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]

      return {
        source: initialMatrix,
        matrix: { ...baseMatrix, [role]: updated },
      }
    })
  }

  function resetMatrix() {
    setState({ source: initialMatrix, matrix: initialMatrix })
  }

  return { matrix, togglePermission, resetMatrix }
}
