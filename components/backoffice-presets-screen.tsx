"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, EyeOff, GalleryHorizontal, Search, Trash, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, forwardRef, type ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { ConfirmAlertDialog } from "@/components/confirm-alert-dialog";
import { FilterPills, ListPagination, useListQuery } from "@/components/data-table";
import { useAccount } from "@/components/use-account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ApiError, api, type OutputKind, type PromptPreset } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import { presetLabPathFromPreset } from "@/lib/content-format";
import { usePresetCopy } from "@/lib/preset-i18n";
import { cn } from "@/lib/utils";

const FALLBACK_THUMB = "/segment-styles/technology/product/hero.svg";
const PRESETS_PAGE_SIZE = 12;

function carouselSlidesOf(preset: PromptPreset) {
  return (preset.assets ?? [])
    .filter((item) => item.role === "carousel_slide" && item.url)
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

/** Format badge follows content_format only (subject/output_kind is separate). */
function presetFormat(preset: PromptPreset): "image" | "carousel" | "video" {
  if (preset.content_format === "carousel" || preset.content_format === "video") {
    return preset.content_format;
  }
  if (preset.content_format === "image") {
    return "image";
  }
  // Legacy rows without content_format: only true multi-slide market topics.
  if (preset.output_kind === "market_topic" && preset.lab_visual_format !== "single") {
    return "carousel";
  }
  return "image";
}

function presetIsCarousel(preset: PromptPreset) {
  return presetFormat(preset) === "carousel";
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
  const router = useRouter();
  const { me } = useAccount();
  const isSuperAdmin = me.data?.user.platform_role === "super_admin";

  const list = useListQuery({
    defaultSort: "name",
    filterKeys: ["output_kind", "content_format", "status"],
    pageSize: PRESETS_PAGE_SIZE,
  });

  const outputKind = list.filters.output_kind || "";
  const contentFormat = list.filters.content_format || "";
  const status = list.filters.status || "";

  const kindsQuery = useQuery({
    queryKey: ["output-kinds", "catalog"],
    queryFn: () => api<{ output_kinds: OutputKind[] }>("/v1/output-kinds?published=false"),
    enabled: isSuperAdmin,
  });

  const presetsQuery = useQuery({
    queryKey: ["backoffice-prompt-presets", outputKind, contentFormat],
    queryFn: () => {
      const params = new URLSearchParams();
      if (outputKind) {
        params.set("output_kind", outputKind);
      }
      if (contentFormat) {
        params.set("content_format", contentFormat);
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

  const clone = useMutation({
    mutationFn: (id: string) =>
      api<{ prompt_preset: PromptPreset }>(`/v1/backoffice/prompt-presets/${id}/clone`, {
        method: "POST",
      }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["backoffice-prompt-presets"] });
      appToast.success("ok");
      const cloned = data.prompt_preset;
      if (cloned?.id) {
        router.push(presetLabPathFromPreset(cloned));
      }
    },
    onError: (err) => {
      appToast.error(err instanceof ApiError ? err.code : "error");
    },
  });

  const presets = presetsQuery.data?.prompt_presets ?? [];
  const busy = setEnabled.isPending || remove.isPending || clone.isPending;

  const filtered = useMemo(() => {
    const needle = list.q.trim().toLowerCase();
    let items = presets.slice();

    if (status === "published") {
      items = items.filter((preset) => preset.enabled);
    } else if (status === "draft") {
      items = items.filter((preset) => !preset.enabled);
    }

    if (needle) {
      items = items.filter((preset) => {
        const format = presetFormat(preset);
        const haystack = [
          presetCopy.name(preset),
          presetCopy.blurb(preset),
          preset.name,
          preset.blurb,
          preset.style_key,
          preset.output_kind,
          creation(`outputKinds.${preset.output_kind}`),
          t(`formats.${format}.title`),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      });
    }

    const collator = new Intl.Collator(undefined, { sensitivity: "base" });
    items.sort((a, b) => {
      const left = presetCopy.name(a);
      const right = presetCopy.name(b);
      const byName = collator.compare(left, right);
      return list.order === "desc" ? -byName : byName;
    });

    return items;
  }, [creation, list.order, list.q, presetCopy, presets, status, t]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / list.pageSize));
  const page = Math.min(list.page, pages);
  const pageRows = filtered.slice((page - 1) * list.pageSize, page * list.pageSize);
  const searchId = "backoffice-presets-search";

  return (
    <TooltipProvider delayDuration={300}>
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <div className="space-y-1">
          <p className="text-sm text-ink/70">{t("presetsLead")}</p>
          {!presetsQuery.isLoading && total > 0 ? (
            <p className="text-xs text-ink/55">
              {list.filtering || status
                ? t("presetsCountFiltered", { shown: total, total: presets.length })
                : t("presetsCount", { count: total })}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Label htmlFor={searchId} className="sr-only">
              {t("searchPresets")}
            </Label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id={searchId}
              value={list.draft}
              placeholder={t("searchPresets")}
              onChange={(event) => list.setDraft(event.target.value)}
              className="h-11 rounded-full border-transparent bg-muted pr-11 pl-10 shadow-none"
            />
            {list.draft ? (
              <button
                type="button"
                className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                onClick={() => list.setDraft("")}
                aria-label={lists("clearSearch")}
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>
          <FilterPills
            controlsId="backoffice-presets-filters"
            filters={[
              {
                key: "content_format",
                label: t("contentFormat"),
                allLabel: lists("all"),
                options: [
                  { value: "image", label: t("formats.image.title") },
                  { value: "carousel", label: t("formats.carousel.title") },
                  { value: "video", label: t("formats.video.title") },
                ],
              },
              {
                key: "output_kind",
                label: t("outputKind"),
                allLabel: lists("all"),
                options: (kindsQuery.data?.output_kinds ?? []).map((kind) => ({
                  value: kind.code,
                  label: creation(`outputKinds.${kind.code}`),
                })),
              },
              {
                key: "status",
                label: t("statusFilter"),
                allLabel: lists("all"),
                options: [
                  { value: "published", label: t("statusPublished") },
                  { value: "draft", label: t("statusDraft") },
                ],
              },
            ]}
            values={list.filters}
            onChange={list.setFilter}
          />
        </div>

        {presetsQuery.isLoading ? (
          <ul className="space-y-3" aria-busy="true" aria-label={lists("loading")}>
            {Array.from({ length: 4 }).map((_, index) => (
              <li key={index} className="flex gap-3 rounded-xl border border-input bg-card p-3">
                <Skeleton className="size-20 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2 py-1">
                  <Skeleton className="h-5 w-2/5" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {!presetsQuery.isLoading && total === 0 ? (
          <div className="rounded-xl border border-dashed border-input px-4 py-10 text-center">
            <p className="text-sm text-ink/70">{list.filtering ? t("noResults") : t("empty")}</p>
            {!list.filtering ? (
              <Button asChild className="mt-4 min-h-11">
                <Link href="/backoffice/presets/new">{t("new")}</Link>
              </Button>
            ) : null}
          </div>
        ) : null}

        {!presetsQuery.isLoading && total > 0 ? (
          <ul className="space-y-3">
            {pageRows.map((preset) => {
              const slides = carouselSlidesOf(preset);
              const isCarousel = presetIsCarousel(preset);
              const format = presetFormat(preset);
              const cloningThis = clone.isPending && clone.variables === preset.id;
              return (
                <li key={preset.id}>
                  <div className="group flex flex-col gap-3 overflow-hidden rounded-xl border border-input bg-card p-3 transition-colors hover:border-ink/25 sm:flex-row sm:items-stretch sm:gap-4">
                    <Link
                      href={presetLabPathFromPreset(preset)}
                      className="flex min-w-0 flex-1 gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={t("openPreset", { name: presetCopy.name(preset) })}
                    >
                      <span className="relative block w-[4.5rem] shrink-0 sm:w-24">
                        {isCarousel ? (
                          <span
                            aria-hidden
                            className="absolute top-1.5 left-1.5 size-full rounded-lg border border-input bg-muted"
                          />
                        ) : null}
                        <span className="relative block overflow-hidden rounded-lg bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={presetThumb(preset, isCarousel)}
                            alt=""
                            className={cn(
                              "w-full object-cover",
                              isCarousel ? "aspect-[4/5]" : "aspect-square",
                            )}
                          />
                          {isCarousel ? (
                            <span className="pointer-events-none absolute top-1 right-1 inline-flex items-center gap-0.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              <GalleryHorizontal className="size-3" aria-hidden />
                              {slides.length > 1 ? slides.length : null}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1 py-0.5">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-base font-medium text-ink">
                            {presetCopy.name(preset)}
                          </span>
                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                              preset.enabled
                                ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                                : "bg-muted text-ink/65",
                            )}
                          >
                            {preset.enabled ? t("statusPublished") : t("statusDraft")}
                          </span>
                        </span>
                        {presetCopy.blurb(preset) ? (
                          <span className="mt-1 line-clamp-2 block text-sm text-ink/65">
                            {presetCopy.blurb(preset)}
                          </span>
                        ) : null}
                        <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink/55">
                          <span>{creation(`outputKinds.${preset.output_kind}`)}</span>
                          <span aria-hidden>·</span>
                          <span className="inline-flex items-center gap-1">
                            {isCarousel ? <GalleryHorizontal className="size-3.5" aria-hidden /> : null}
                            {isCarousel && slides.length > 1
                              ? t("carouselSlides", { count: slides.length })
                              : t(`formats.${format}.title`)}
                          </span>
                        </span>
                      </span>
                    </Link>

                    <div className="flex shrink-0 items-center justify-end gap-1 border-t border-input/70 pt-2 sm:flex-col sm:justify-center sm:border-t-0 sm:border-l sm:pt-0 sm:pl-3">
                      <ActionWithTooltip label={preset.enabled ? t("unpublish") : t("publish")}>
                        <ActionIcon
                          label={preset.enabled ? t("unpublish") : t("publish")}
                          disabled={busy}
                          onClick={() =>
                            setEnabled.mutate({ id: preset.id, enabled: !preset.enabled })
                          }
                        >
                          {preset.enabled ? (
                            <EyeOff className="size-4" aria-hidden />
                          ) : (
                            <Eye className="size-4" aria-hidden />
                          )}
                        </ActionIcon>
                      </ActionWithTooltip>
                      <ActionWithTooltip label={cloningThis ? t("cloning") : t("clone")}>
                        <span className="inline-flex">
                          <ConfirmAlertDialog
                            title={t("clone")}
                            description={t("cloneConfirm")}
                            cancelLabel={t("cancel")}
                            confirmLabel={cloningThis ? t("cloning") : t("clone")}
                            destructive={false}
                            onConfirm={() => clone.mutate(preset.id)}
                            trigger={
                              <ActionIcon
                                label={cloningThis ? t("cloning") : t("clone")}
                                disabled={busy}
                              >
                                <Copy className="size-4" aria-hidden />
                              </ActionIcon>
                            }
                          />
                        </span>
                      </ActionWithTooltip>
                      <ActionWithTooltip label={t("delete")}>
                        <span className="inline-flex">
                          <ConfirmAlertDialog
                            title={t("delete")}
                            description={t("deleteConfirm")}
                            cancelLabel={t("cancel")}
                            confirmLabel={t("delete")}
                            onConfirm={() => remove.mutate(preset.id)}
                            trigger={
                              <ActionIcon label={t("delete")} disabled={busy} destructive>
                                <Trash className="size-4" aria-hidden />
                              </ActionIcon>
                            }
                          />
                        </span>
                      </ActionWithTooltip>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {!presetsQuery.isLoading ? <ListPagination list={list} total={total} /> : null}
      </div>
    </TooltipProvider>
  );
}

function ActionWithTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
}

const ActionIcon = forwardRef<
  HTMLButtonElement,
  {
    label: string;
    disabled?: boolean;
    onClick?: () => void;
    destructive?: boolean;
    children: ReactNode;
  }
>(function ActionIcon({ label, disabled, onClick, destructive, children }, ref) {
  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "size-11 shrink-0",
        destructive && "text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40",
      )}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
    >
      {children}
    </Button>
  );
});
