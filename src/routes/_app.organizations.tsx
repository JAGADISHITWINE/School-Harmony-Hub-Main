import { createFileRoute } from "@tanstack/react-router";
import { OrganizationsPage } from "@/modules/organizations/OrganizationsPage";

export const Route = createFileRoute("/_app/organizations")({
  component: OrganizationsPage,
});
