import { createFileRoute } from "@tanstack/react-router";
import { TeacherLinkingPage } from "@/modules/teachers/TeacherLinkingPage";

export const Route = createFileRoute("/_app/teacher-linking")({
  component: TeacherLinkingPage,
});
