import { createFileRoute } from "@tanstack/react-router";
import { ClassMentorManagementPage } from "@/modules/teachers/ClassMentorManagementPage";

export const Route = createFileRoute("/_app/class-mentors")({
  component: ClassMentorManagementPage,
});
