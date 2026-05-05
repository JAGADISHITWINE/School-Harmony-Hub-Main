import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/students/")({
  beforeLoad: () => {
    throw redirect({ to: "/students/registry" });
  },
});
