import { createFileRoute } from "@tanstack/react-router";
import { HodLinkingPage } from "@/modules/teachers/HodLinkingPage";

export const Route = createFileRoute("/_app/hod-linking")({
  component: HodLinkingPage,
});
