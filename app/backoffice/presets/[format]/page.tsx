"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/components/use-account";
import { api, type PromptPreset } from "@/lib/api";
import { normalizeFormatParam, presetLabNewPath, presetLabPathFromPreset } from "@/lib/content-format";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * `/backoffice/presets/{format}` → list filtered by format.
 * Legacy `/backoffice/presets/{uuid}` → `/backoffice/presets/{format}/{uuid}`.
 */
export default function BackofficePresetFormatIndexPage() {
  const params = useParams<{ format: string }>();
  const router = useRouter();
  const t = useTranslations("backoffice");
  const { me, loading } = useAccount();
  const isSuperAdmin = me.data?.user.platform_role === "super_admin";
  const segment = typeof params.format === "string" ? params.format : "";
  const format = normalizeFormatParam(segment);
  const looksLikeId = UUID_RE.test(segment);

  const presetQuery = useQuery({
    queryKey: ["backoffice-prompt-preset", segment],
    queryFn: () => api<{ prompt_preset: PromptPreset }>(`/v1/backoffice/prompt-presets/${segment}`),
    enabled: isSuperAdmin && looksLikeId,
  });

  useEffect(() => {
    if (looksLikeId) {
      const preset = presetQuery.data?.prompt_preset;
      if (preset) {
        router.replace(presetLabPathFromPreset(preset));
      }
      return;
    }
    if (format) {
      router.replace(`/backoffice/presets?content_format=${encodeURIComponent(format)}`);
    }
  }, [format, looksLikeId, presetQuery.data?.prompt_preset, router]);

  if (loading || me.isLoading) {
    return null;
  }

  if (!isSuperAdmin) {
    return (
      <AppShell title={t("title")}>
        <p className="text-sm text-ink/70">{t("forbidden")}</p>
      </AppShell>
    );
  }

  if (looksLikeId && (presetQuery.isLoading || presetQuery.isSuccess)) {
    return null;
  }

  if (format) {
    return null;
  }

  return (
    <AppShell title={t("presets")}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <p className="text-sm text-ink/70">{t("newFormatUnknown")}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/backoffice/presets">{t("backToList")}</Link>
          </Button>
          <Button asChild className="min-h-11">
            <Link href="/backoffice/presets/new">{t("new")}</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-11">
            <Link href={presetLabNewPath("image")}>{t("formats.image.title")}</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
