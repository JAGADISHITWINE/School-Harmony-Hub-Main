import { createFileRoute } from "@tanstack/react-router";
import { AcademicMastersPage } from "@/modules/academic/AcademicMastersPage";

export const Route = createFileRoute("/_app/academic/classes")({
  component: () => <AcademicMastersPage initialTab="classes" />,
});
