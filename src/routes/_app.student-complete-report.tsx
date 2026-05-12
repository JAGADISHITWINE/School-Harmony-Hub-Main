import { createFileRoute } from "@tanstack/react-router";
import { StudentCompleteReportPage } from "@/modules/reports/StudentCompleteReportPage";

export const Route = createFileRoute("/_app/student-complete-report")({
  component: StudentCompleteReportPage,
});
