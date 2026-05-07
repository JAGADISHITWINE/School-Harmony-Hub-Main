import { createFileRoute } from "@tanstack/react-router";
import { TeachersPage } from "@/modules/teachers/TeachersPage";

export const Route = createFileRoute("/_app/teachers")({
  component: TeachersPage,
});
