import { createFileRoute } from "@tanstack/react-router";
import { MenusModule } from "@/modules/menus/MenusModule";
export const Route = createFileRoute("/_app/menus")({ component: MenusModule });