import { createFileRoute } from "@tanstack/react-router";
import AppMain from "@/components/AppMain";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tracker — Edging & Recovery" },
      { name: "description", content: "Personal tracker with AI assistant, voice, challenges, and the annual November Challenge." },
    ],
  }),
  component: () => <AppMain />,
});
