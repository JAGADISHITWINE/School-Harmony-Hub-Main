import { createFileRoute } from "@tanstack/react-router";
import { FeesModule } from "@/modules/fees/FeesModule";

export const Route = createFileRoute("/_app/fees/types")({
  component: () => <FeesModule initialTab="types" />,
});
