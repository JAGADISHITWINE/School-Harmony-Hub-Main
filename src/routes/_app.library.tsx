import { createFileRoute } from "@tanstack/react-router";
import { LibraryModule } from "../modules/library/LibraryModule";

export const Route = createFileRoute("/_app/library")({ component: LibraryModule });
