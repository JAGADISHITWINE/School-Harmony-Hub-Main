import { createFileRoute } from "@tanstack/react-router";
import { StudentAdmissionsPage } from "@/modules/students/StudentAdmissionsPage";

export const Route = createFileRoute("/_app/students/admissions")({
  component: StudentAdmissionsPage,
});
