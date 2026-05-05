import { createFileRoute } from "@tanstack/react-router";
import { StudentStatusPage } from "@/modules/students/StudentStatusPage";

export const Route = createFileRoute("/_app/students/status")({
  component: StudentStatusPage,
});
