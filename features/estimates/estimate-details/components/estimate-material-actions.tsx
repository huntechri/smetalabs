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
            aria-label={`Material actions for ${title}`}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <DotsThreeVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Frame>
  )
}
