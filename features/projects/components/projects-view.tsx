import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"

export function ProjectsView() {
  return (
    /* Outer — padding from edges (shadcn pattern) */
    <div className="h-full px-4 lg:px-6">

      {/* Inner — visual container */}
      <div className="h-full rounded-lg border border-dashed p-6 flex flex-col gap-4">

        {/* ButtonGroup */}
        <ButtonGroup>
          <Button variant="outline">Button 1</Button>
          <Button variant="outline">Button 2</Button>
          <Button variant="outline">Button 3</Button>
        </ButtonGroup>

        {/* Two nested empty containers */}
        <div className="rounded-lg border border-dashed p-6">
          <div className="rounded-lg border border-dashed p-6" />
        </div>

      </div>
    </div>
  )
}
