import { createFileRoute } from "@tanstack/react-router";
import { StudentGuardiansPage } from "@/modules/students/StudentGuardiansPage";

export const Route = createFileRoute("/_app/students/guardians")({
  component: StudentGuardiansPage,
});
