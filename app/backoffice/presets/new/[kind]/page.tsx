"use client";

import { useParams } from "next/navigation";

import { BackofficePresetEditor } from "@/components/backoffice-preset-editor";

export default function NewBackofficePresetKindPage() {
  const params = useParams<{ kind: string }>();
  return <BackofficePresetEditor kind={typeof params.kind === "string" ? params.kind : ""} />;
}
