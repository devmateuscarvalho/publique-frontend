"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";

import { CreationManualDraftScreen } from "@/components/manual-post-screen";

export default function PostDraftPage() {
  const params = useParams<{ postId: string }>();
  return (
    <Suspense>
      <CreationManualDraftScreen postId={params.postId} />
    </Suspense>
  );
}
