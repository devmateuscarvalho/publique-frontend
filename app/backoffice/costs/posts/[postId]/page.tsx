"use client";

import { useParams } from "next/navigation";

import { BackofficeAIPostCostScreen } from "@/components/backoffice-ai-costs";

export default function BackofficeCostPostPage() {
  const params = useParams<{ postId: string }>();
  const postId = typeof params.postId === "string" ? params.postId : "";
  return <BackofficeAIPostCostScreen postId={postId} />;
}
