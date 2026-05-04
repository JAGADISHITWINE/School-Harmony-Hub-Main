import { createFileRoute } from "@tanstack/react-router";
import { InstitutionsPage } from "@/modules/institutions/InstitutionsPage";

export const Route = createFileRoute("/_app/institutions")({
  component: InstitutionsPage,
});
