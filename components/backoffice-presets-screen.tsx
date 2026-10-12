"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, GalleryHorizontal, Trash } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Suspense } from "react";

import { AppShell } from "@/components/app-shell";
import { ConfirmAlertDialog } from "@/components/confirm-alert-dialog";
import { FilterPills, useListQuery } from "@/components/data-table";
import { useAccount } from "@/components/use-account";
import { Button } from "@/components/ui/button";
import { ApiError, api, type OutputKind, type PromptPreset } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import { usePresetCopy } from "@/lib/preset-i18n";

const FALLBACK_THUMB = "/segment-styles/technology/product/hero.svg";

function carouselSlidesOf(preset: PromptPreset) {
  return (preset.assets ?? [])
    .filter((item) => item.role === "carousel_slide" && item.url)
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

function presetIsCarousel(preset: PromptPreset) {
  if (carouselSlidesOf(preset).length > 0) {
    return true;
  }
  return preset.output_kind === "market_topic" && preset.lab_visual_format === "carousel";
}

function presetThumb(preset: PromptPreset, isCarousel: boolean) {
  const firstSlide = carouselSlidesOf(preset)[0]?.url;
  if (isCarousel && firstSlide) {
    return firstSlide;
  }
  return preset.preview_path || FALLBACK_THUMB;
}

export function BackofficePresetsScreen() {
  const t = useTranslations("backoffice");
  const { me, loading } = useAccount();
  const isSuperAdmin = me.data?.user.platform_role === "super_admin";

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

  return (
    <AppShell
      title={t("presets")}
      action={
        <Button asChild className="min-h-11">
          <Link href="/backoffice/presets/new">{t("new")}</Link>
        </Button>
      }
    >
      <Suspense>
        <PresetsBody />
      </Suspense>
    </AppShell>
  );
}

function PresetsBody() {
  const t = useTranslations("backoffice");
  const creation = useTranslations("creation");
  const presetCopy = usePresetCopy();
  const lists = useTranslations("lists");
  const queryClient = useQueryClient();
  const { me } = useAccount();
  const isSuperAdmin = me.data?.user.platform_role === "super_admin";

  const list = useListQuery({
    defaultSort: "name",
    filterKeys: ["output_kind"],
  });

  const outputKind = list.filters.output_kind || "";

  const kindsQuery = useQuery({
    queryKey: ["output-kinds", "catalog"],
    queryFn: () => api<{ output_kinds: OutputKind[] }>("/v1/output-kinds?published=false"),
    enabled: isSuperAdmin,
  });

  const presetsQuery = useQuery({
    queryKey: ["backoffice-prompt-presets", outputKind],
    queryFn: () => {
      const params = new URLSearchParams();
      if (outputKind) {
        params.set("output_kind", outputKind);
      }
      const query = params.toString();
      return api<{ prompt_presets: PromptPreset[] }>(
        `/v1/backoffice/prompt-presets${query ? `?${query}` : ""}`,
      );
    },
    enabled: isSuperAdmin,
  });

  const setEnabled = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api<{ prompt_preset: PromptPreset }>(`/v1/backoffice/prompt-presets/${id}/enabled`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["backoffice-prompt-presets"] });
      appToast.success("ok");
    },
    onError: (err) => {
      appToast.error(err instanceof ApiError ? err.code : "error");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/v1/backoffice/prompt-presets/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["backoffice-prompt-presets"] });
      appToast.success("ok");
    },
    onError: (err) => {
      appToast.error(err instanceof ApiError ? err.code : "error");
    },
  });

  const presets = presetsQuery.data?.prompt_presets ?? [];
  const busy = setEnabled.isPending || remove.isPending;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <p className="text-sm text-ink/70">{t("presetsLead")}</p>
      <FilterPills
        controlsId="backoffice-presets-filters"
        filters={[
          {
            key: "output_kind",
            label: t("outputKind"),
            allLabel: lists("all"),
            options: (kindsQuery.data?.output_kinds ?? []).map((kind) => ({
              value: kind.code,
              label: creation(`outputKinds.${kind.code}`),
            })),
          },
        ]}
        values={list.filters}
        onChange={list.setFilter}
      />
      {presetsQuery.isLoading ? <p className="text-sm text-ink/70">…</p> : null}
      {!presetsQuery.isLoading && presets.length === 0 ? (
        <p className="text-sm text-ink/70">{list.filtering ? t("noResults") : t("empty")}</p>
      ) : null}
      <ul className="space-y-3">
        {presets.map((preset) => {
          const slides = carouselSlidesOf(preset);
          const isCarousel = presetIsCarousel(preset);
          return (
          <li key={preset.id}>
            <div className="flex flex-col gap-3 overflow-hidden rounded-xl border border-input bg-card p-3 sm:flex-row sm:items-stretch">
              <Link
                href={`/backoffice/presets/${preset.id}`}
                className="flex min-w-0 flex-1 gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="relative block w-20 shrink-0">
                  {isCarousel ? (
                    <span
                      aria-hidden
                      className="absolute top-1.5 left-1.5 size-full rounded-lg border border-input bg-muted"
                    />
                  ) : null}
                  <span className="relative block overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={presetThumb(preset, isCarousel)}
                      alt=""
                      className={`w-full object-cover ${isCarousel ? "aspect-[4/5]" : "aspect-square"}`}
                    />
                    {isCarousel ? (
                      <span className="pointer-events-none absolute top-1 right-1 inline-flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        <GalleryHorizontal className="size-3" aria-hidden />
                        {slides.length > 1 ? slides.length : null}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-medium">{presetCopy.name(preset)}</span>
                  <span className="mt-1 block text-sm text-ink/70">
                    {creation(`outputKinds.${preset.output_kind}`)}
                  </span>
                  {isCarousel ? (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-ink">
                      <GalleryHorizontal className="size-3.5 shrink-0" aria-hidden />
                      {slides.length > 1
                        ? t("carouselSlides", { count: slides.length })
                        : t("carouselBadge")}
                    </span>
                  ) : null}
                  <span className="mt-1 block text-xs text-ink/60">
                    {preset.enabled ? t("statusPublished") : t("statusDraft")}
                  </span>
                </span>
              </Link>
              <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:justify-center">
                {preset.enabled ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 flex-1 justify-center gap-2 sm:flex-none sm:justify-start"
                    disabled={busy}
                    onClick={() => setEnabled.mutate({ id: preset.id, enabled: false })}
                  >
                    <EyeOff className="size-4 shrink-0" aria-hidden />
                    {t("unpublish")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 flex-1 justify-center gap-2 sm:flex-none sm:justify-start"
                    disabled={busy}
                    onClick={() => setEnabled.mutate({ id: preset.id, enabled: true })}
                  >
                    <Eye className="size-4 shrink-0" aria-hidden />
                    {t("publish")}
                  </Button>
                )}
                <ConfirmAlertDialog
                  title={t("delete")}
                  description={t("deleteConfirm")}
                  cancelLabel={t("cancel")}
                  confirmLabel={t("delete")}
                  onConfirm={() => remove.mutate(preset.id)}
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 flex-1 justify-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 sm:flex-none sm:justify-start"
                      disabled={busy}
                    >
                      <Trash className="size-4 shrink-0" aria-hidden />
                      {t("delete")}
                    </Button>
                  }
                />
              </div>
            </div>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
