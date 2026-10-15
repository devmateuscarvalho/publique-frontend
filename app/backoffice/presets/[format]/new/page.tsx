"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useTranslations } from "next-intl";

import { AppShell } from "@/components/app-shell";
import { BackofficePresetEditor } from "@/components/backoffice-preset-editor";
import { Button } from "@/components/ui/button";
import {
  defaultSubjectForFormat,
  normalizeFormatParam,
  presetLabNewPath,
} from "@/lib/content-format";

function NewPresetByFormatBody() {
  const params = useParams<{ format: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("backoffice");
  const raw = typeof params.format === "string" ? params.format : "";
  const format = normalizeFormatParam(raw);
  const subjectFromQuery = searchParams.get("subject")?.trim() || "";

  useEffect(() => {
    if (!format) {
      return;
    }
    if (raw.trim().toLowerCase() === format) {
      return;
    }
    const subject = subjectFromQuery ? `?subject=${encodeURIComponent(subjectFromQuery)}` : "";
    router.replace(`${presetLabNewPath(format)}${subject}`);
  }, [format, raw, router, subjectFromQuery]);

  if (!format) {
    return (
      <AppShell title={t("new")}>
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
          <p className="text-sm text-ink/70">{t("newFormatUnknown")}</p>
          <Button asChild variant="outline" className="min-h-11 w-fit">
            <Link href="/backoffice/presets/new">{t("backToFormats")}</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (raw.trim().toLowerCase() !== format) {
    return null;
  }

  if (format === "video") {
    return (
      <AppShell title={t("formats.video.title")}>
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
          <Button asChild variant="outline" className="min-h-11 w-fit">
            <Link href="/backoffice/presets/new">{t("backToFormats")}</Link>
          </Button>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{t("formats.video.title")}</h2>
            <p className="text-sm text-ink/70">{t("formats.video.soon")}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const subject = subjectFromQuery || defaultSubjectForFormat(format);
  return <BackofficePresetEditor format={format} kind={subject} />;
}

export default function NewBackofficePresetByFormatPage() {
  return (
    <Suspense fallback={null}>
      <NewPresetByFormatBody />
    </Suspense>
  );
}
