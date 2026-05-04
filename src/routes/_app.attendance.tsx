import { createFileRoute } from "@tanstack/react-router";
import { AttendancePage } from "@/modules/attendance/AttendancePage";
export const Route = createFileRoute("/_app/attendance")({ component: AttendancePage });