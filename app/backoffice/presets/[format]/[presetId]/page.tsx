"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { AppShell } from "@/components/app-shell";
import { BackofficePresetEditor } from "@/components/backoffice-preset-editor";
import { Button } from "@/components/ui/button";
import { normalizeFormatParam, presetLabEditPath } from "@/lib/content-format";

export default function EditBackofficePresetByFormatPage() {
  const params = useParams<{ format: string; presetId: string }>();
  const router = useRouter();
  const t = useTranslations("backoffice");
  const rawFormat = typeof params.format === "string" ? params.format : "";
  const format = normalizeFormatParam(rawFormat);
  const presetId = typeof params.presetId === "string" ? params.presetId : "";

  useEffect(() => {
    if (!format || !presetId) {
      return;
    }
    if (rawFormat.trim().toLowerCase() !== format) {
      router.replace(presetLabEditPath(format, presetId));
    }
  }, [format, presetId, rawFormat, router]);

  if (!format || format === "video" || !presetId) {
    return (
      <AppShell title={t("edit")}>
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
          <p className="text-sm text-ink/70">{t("newFormatUnknown")}</p>
          <Button asChild variant="outline" className="min-h-11 w-fit">
            <Link href="/backoffice/presets">{t("backToList")}</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return <BackofficePresetEditor presetId={presetId} format={format} />;
}
