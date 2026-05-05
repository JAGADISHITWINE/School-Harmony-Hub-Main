import { createFileRoute } from "@tanstack/react-router";
import { AcademicMastersPage } from "@/modules/academic/AcademicMastersPage";

export const Route = createFileRoute("/_app/academic/sections")({
  component: () => <AcademicMastersPage initialTab="sections" />,
});
