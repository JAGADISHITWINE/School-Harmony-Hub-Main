import { createFileRoute } from "@tanstack/react-router";
import { StudentDocumentsPage } from "@/modules/students/StudentDocumentsPage";

export const Route = createFileRoute("/_app/students/documents")({
  component: StudentDocumentsPage,
});
