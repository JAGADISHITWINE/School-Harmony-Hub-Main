import { createFileRoute } from "@tanstack/react-router";
import { UsersModule } from "@/modules/users/UsersModule";

export const Route = createFileRoute("/_app/settings/users")({
  component: UsersModule,
});
