import { createFileRoute } from "@tanstack/react-router";
import { ExamsModule } from "@/modules/exams/ExamsModule";

export const Route = createFileRoute("/_app/exams")({
  component: ExamsModule,
});
