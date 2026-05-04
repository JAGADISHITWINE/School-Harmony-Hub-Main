import { createFileRoute } from "@tanstack/react-router";
import { StudentsModule } from "@/modules/students/StudentsModule";
export const Route = createFileRoute("/_app/students")({ component: StudentsModule });