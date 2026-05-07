import { createFileRoute } from "@tanstack/react-router";
import { TimetableModule } from "@/modules/timetable/TimetableModule";

export const Route = createFileRoute("/_app/timetable")({
  component: TimetableModule,
});
