import { createFileRoute } from "@tanstack/react-router";
import { StudentAcademicRecordsPage } from "@/modules/students/StudentAcademicRecordsPage";

export const Route = createFileRoute("/_app/students/academic-records")({
  component: StudentAcademicRecordsPage,
});
