import { createFileRoute } from "@tanstack/react-router";
import { RolesPage } from "@/modules/roles/RolesPage";
export const Route = createFileRoute("/_app/roles")({ component: RolesPage });