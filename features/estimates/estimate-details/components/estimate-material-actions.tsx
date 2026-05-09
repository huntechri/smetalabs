"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Frame } from "@/components/ui/frame"
import { DotsThreeVerticalIcon } from "@phosphor-icons/react"

export function EstimateMaterialActions({ title }: { title: string }) {
  return (
    <Frame className="border-blue-300">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Действия с материалом ${title}`}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <DotsThreeVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem>Редактировать</DropdownMenuItem>
            <DropdownMenuItem>Дублировать</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">Удалить</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Frame>
  )
}
