import { createFileRoute } from "@tanstack/react-router";
import { AcademicMastersPage } from "@/modules/academic/AcademicMastersPage";

export const Route = createFileRoute("/_app/academic/years")({
  component: () => <AcademicMastersPage initialTab="academic-years" />,
});
