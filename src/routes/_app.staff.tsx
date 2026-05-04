import { createFileRoute } from "@tanstack/react-router";
import { StaffModule } from "@/modules/staff/StaffModule";
export const Route = createFileRoute("/_app/staff")({ component: StaffModule });