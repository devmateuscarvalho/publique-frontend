"use client";

import { Suspense } from "react";

import { CreationManualScreen } from "@/components/manual-post-screen";

export default function PostsPage() {
  return (
    <Suspense>
      <CreationManualScreen />
    </Suspense>
  );
}
