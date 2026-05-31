"use client"

import { Button } from "@/components/ui/button"

export function PermissionsMatrixToolbar({ onReset }: { onReset: () => void }) {
  return (
    <div className="mt-4 flex items-center justify-between">
      <Button variant="outline" size="sm" onClick={onReset}>
        Сбросить
      </Button>
      <Button
        size="sm"
        disabled
        title="Сохранение матрицы будет подключено отдельной безопасной операцией"
      >
        Сохранить · скоро
      </Button>
    </div>
  )
}
