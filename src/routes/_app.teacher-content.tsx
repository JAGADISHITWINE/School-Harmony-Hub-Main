import { createFileRoute } from "@tanstack/react-router";
import { TeacherContentPage } from "@/modules/teacher-content/TeacherContentPage";

export const Route = createFileRoute("/_app/teacher-content")({ component: TeacherContentPage });
