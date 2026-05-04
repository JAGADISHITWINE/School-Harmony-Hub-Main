import { createFileRoute } from "@tanstack/react-router";
import { NotificationsModule } from "@/modules/notifications/NotificationsModule";
export const Route = createFileRoute("/_app/notifications")({ component: NotificationsModule });