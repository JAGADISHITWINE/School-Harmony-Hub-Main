import { createFileRoute } from "@tanstack/react-router";
import { PermissionsPage } from "@/modules/permissions/PermissionsPage";

export const Route = createFileRoute("/_app/settings/perms")({
  component: PermissionsPage,
});
