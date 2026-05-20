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

export function EstimateMaterialActions({
  disabled,
  onArchive,
  title,
}: {
  disabled: boolean
  onArchive: () => void
  title: string
}) {
  return (
    <Frame>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Действия с материалом ${title}`}
            disabled={disabled}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <DotsThreeVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem
              disabled={disabled}
              variant="destructive"
              onSelect={onArchive}
            >
              Удалить
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Frame>
  )
}
