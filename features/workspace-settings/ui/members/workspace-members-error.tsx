"use client"

import { User } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function WorkspaceMembersError({ error }: { error: string }) {
  return (
    <Card className="border-dashed border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="size-4" />
          Участники
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 text-center">
        <p className="text-sm text-destructive">
          Не удалось загрузить список участников: {error}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => window.location.reload()}
        >
          Попробовать снова
        </Button>
      </CardContent>
    </Card>
  )
}
