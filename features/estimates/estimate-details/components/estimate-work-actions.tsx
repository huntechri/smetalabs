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
        frameClassName="border-green-300"
        size="icon-sm"
        variant="ghost"
      >
        <PencilSimpleIcon />
      </FramedButton>
      <FramedButton
        aria-label="Дублировать работу"
        frameClassName="border-green-300"
        size="icon-sm"
        variant="ghost"
      >
        <CopyIcon />
      </FramedButton>
      <FramedButton
        aria-label="Настройки работы"
        frameClassName="border-green-300"
        size="icon-sm"
        variant="ghost"
      >
        <GearSixIcon />
      </FramedButton>
    </div>
  )
}
