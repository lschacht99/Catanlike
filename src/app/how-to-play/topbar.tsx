"use client";

import { TopBar } from "@/components/ui";

/** Client wrapper so the server page can render the back button. */
export function TopBarStatic({ title }: { title: string }) {
  return <TopBar title={title} />;
}
