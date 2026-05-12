import { createFileRoute } from "@tanstack/react-router";
import { StudentPromotionsPage } from "@/modules/students/StudentPromotionsPage";

export const Route = createFileRoute("/_app/students/promotions")({
  component: StudentPromotionsPage,
});
