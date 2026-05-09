import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import type { Project } from "@/types/project"

type ProjectCardProps = Pick<Project, "title" | "description" | "image" | "link">

export function ProjectCard({ title, description, image, link }: ProjectCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <AspectRatio ratio={9 / 16}>
                    <Image src={image} alt={title} fill className="rounded-md object-cover" />
                </AspectRatio>
            </CardContent>
            <CardFooter>
                <Button asChild>
                    <a href={link}>View Project</a>
                </Button>
            </CardFooter>
        </Card>
    )
}