import { createFileRoute } from "@tanstack/react-router";
import { StudentRegistryPage } from "@/modules/students/StudentRegistryPage";

export const Route = createFileRoute("/_app/students/registry")({
  component: StudentRegistryPage,
});
