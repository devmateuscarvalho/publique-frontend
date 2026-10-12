"use client";

import { useParams } from "next/navigation";

import { BackofficePresetEditor } from "@/components/backoffice-preset-editor";

export default function EditBackofficePresetPage() {
  const params = useParams<{ presetId: string }>();
  return <BackofficePresetEditor presetId={params.presetId} />;
}
