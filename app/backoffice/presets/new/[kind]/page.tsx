"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useTranslations } from "next-intl";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { presetLabNewPath, resolveNewPresetRoute } from "@/lib/content-format";

/** Legacy `/backoffice/presets/new/{format|kind}` → `/backoffice/presets/{format}/new`. */
function LegacyNewPresetRedirect() {
  const params = useParams<{ kind: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("backoffice");
  const raw = typeof params.kind === "string" ? params.kind : "";
  const resolved = resolveNewPresetRoute(raw);
  const subjectFromQuery = searchParams.get("subject")?.trim() || "";

  useEffect(() => {
    if (!resolved) {
      return;
    }
    const subject = subjectFromQuery || resolved.subject || "";
    const search = subject ? `?subject=${encodeURIComponent(subject)}` : "";
    router.replace(`${presetLabNewPath(resolved.format)}${search}`);
  }, [resolved, router, subjectFromQuery]);

  if (!resolved) {
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

  return null;
}

export default function LegacyNewBackofficePresetFormatPage() {
  return (
    <Suspense fallback={null}>
      <LegacyNewPresetRedirect />
    </Suspense>
  );
}
