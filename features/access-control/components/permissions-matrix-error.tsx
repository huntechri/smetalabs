"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function PermissionsMatrixError({
  error,
  onRetry,
}: {
  error: string
  onRetry: () => void | Promise<void>
}) {
  return (
    <Card className="overflow-auto border-destructive/30">
      <CardHeader>
        <CardTitle>Матрица прав доступа</CardTitle>
        <CardDescription className="text-destructive">
          Не удалось загрузить данные: {error}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm" onClick={() => void onRetry()}>
          Попробовать снова
        </Button>
      </CardContent>
    </Card>
  )
}
