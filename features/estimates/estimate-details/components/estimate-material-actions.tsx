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
import {
  CaretDownIcon,
  CaretUpIcon,
  DotsThreeVerticalIcon,
} from "@phosphor-icons/react"

export function EstimateMaterialActions({
  disabled,
  moveDownDisabled,
  moveUpDisabled,
  onArchive,
  onMoveDown,
  onMoveUp,
  title,
}: {
  disabled: boolean
  moveDownDisabled?: boolean
  moveUpDisabled?: boolean
  onArchive: () => void
  onMoveDown?: () => void
  onMoveUp?: () => void
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
              disabled={disabled || moveUpDisabled}
              onSelect={onMoveUp}
            >
              <CaretUpIcon data-icon="inline-start" />
              Выше
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={disabled || moveDownDisabled}
              onSelect={onMoveDown}
            >
              <CaretDownIcon data-icon="inline-start" />
              Ниже
            </DropdownMenuItem>
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