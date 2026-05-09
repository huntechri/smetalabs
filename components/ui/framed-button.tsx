import { type ComponentProps } from "react"
import { Button } from "@/components/ui/button"
import { Frame } from "@/components/ui/frame"

export function FramedButton({
  frameClassName,
  ...props
}: ComponentProps<typeof Button> & {
  frameClassName?: string
}) {
  return (
    <Frame className={frameClassName}>
      <Button {...props} />
    </Frame>
  )
}
