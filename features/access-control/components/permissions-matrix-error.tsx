"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function PermissionsMatrixError({ error }: { error: string }) {
  return (
    <Card className="overflow-auto border-destructive/30">
      <CardHeader>
        <CardTitle>Матрица прав доступа</CardTitle>
        <CardDescription className="text-destructive">
          Не удалось загрузить данные: {error}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          Попробовать снова
        </Button>
      </CardContent>
    </Card>
  )
}
