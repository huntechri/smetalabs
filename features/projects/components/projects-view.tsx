import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"

export function ProjectsView() {
  return (
    /* Общий контейнер */
    <div className="h-full rounded-lg border border-dashed p-6 flex flex-col gap-4">

      {/* ButtonGroup */}
      <ButtonGroup>
        <Button variant="outline">Button 1</Button>
        <Button variant="outline">Button 2</Button>
        <Button variant="outline">Button 3</Button>
      </ButtonGroup>

      {/* Два вложенных пустых контейнера */}
      <div className="rounded-lg border border-dashed p-6">
        <div className="rounded-lg border border-dashed p-6" />
      </div>

    </div>
  )
}
