import {
  CopyIcon,
  GearSixIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react"
import { FramedButton } from "@/components/ui/framed-button"

export function EstimateWorkActions() {
  return (
    <div className="flex items-center gap-1">
      <FramedButton
        aria-label="Редактировать работу"
        size="icon-xs"
        variant="ghost"
      >
        <PencilSimpleIcon />
      </FramedButton>
      <FramedButton
        aria-label="Дублировать работу"
        size="icon-xs"
        variant="ghost"
      >
        <CopyIcon />
      </FramedButton>
      <FramedButton
        aria-label="Настройки работы"
        size="icon-xs"
        variant="ghost"
      >
        <GearSixIcon />
      </FramedButton>
    </div>
  )
}
