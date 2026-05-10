import { createFileRoute } from "@tanstack/react-router";
import { ReportsModule } from "@/modules/reports/ReportsModule";

export const Route = createFileRoute("/_app/reports")({
  component: ReportsModule,
});
