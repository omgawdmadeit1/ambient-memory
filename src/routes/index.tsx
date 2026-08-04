import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/memory/app-shell";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return <AppShell />;
}
