"use client";

import { Suspense } from "react";

import { AutomationWeek } from "@/components/automation-screen";

export default function PostsAutomatePage() {
  return (
    <Suspense>
      <AutomationWeek />
    </Suspense>
  );
}
