import { createFileRoute } from "@tanstack/react-router";
import { ClassesPage } from "@/modules/classes/ClassesPage";

export const Route = createFileRoute("/_app/classes")({
  component: ClassesPage,
});
