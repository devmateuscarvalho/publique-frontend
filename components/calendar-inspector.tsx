"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { SocialNetworkIcon, type SocialNetworkID } from "@/components/social-network-icons";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ApiError, api, type Post } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import { cn } from "@/lib/utils";

const NETWORKS = ["linkedin", "instagram", "facebook", "tiktok"] as const;

export type CalendarEvent = {
  kind: "post" | "projection" | string;
  at: string;
  brand_id: string;
  brand_name: string;
  title: string;
  status: string;
  networks: string[];
  post_id?: string | null;
  slot_id?: string | null;
  origin?: string;
  approval_status?: string;
  publish_at?: string | null;
};

type Integration = { network: string; configured: boolean; page_urn?: string };

function isConnected(row: Integration | undefined) {
  if (!row?.configured) {
    return false;
  }
  if (row.network === "linkedin" || row.network === "facebook") {
    return Boolean(row.page_urn?.trim());
  }
  return true;
}

export function CalendarInspector({
  event,
  zone,
  onClose,
}: {
  event: CalendarEvent | null;
  zone: string;
  onClose: () => void;
}) {
  const t = useTranslations("calendar");
  const creation = useTranslations("creation");
  const errors = useTranslations("errors");
  const format = useFormatter();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<"post" | "series" | "">("");

  const postQuery = useQuery({
    queryKey: ["post", event?.brand_id, event?.post_id],
    queryFn: () => api<{ post: Post }>(`/v1/brands/${event?.brand_id}/posts/${event?.post_id}`),
    enabled: Boolean(event?.kind === "post" && event.post_id && event.brand_id),
  });
  const integrationsQuery = useQuery({
    queryKey: ["integrations", event?.brand_id],
    queryFn: () => api<{ integrations: Integration[] }>(`/v1/brands/${event?.brand_id}/integrations`),
    enabled: Boolean(event?.brand_id),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["calendar"] });
    void queryClient.invalidateQueries({ queryKey: ["post", event?.brand_id, event?.post_id] });
  };
  const cancelPost = useMutation({
    mutationFn: () =>
      api(`/v1/brands/${event?.brand_id}/posts/${event?.post_id}/cancel-schedule`, { method: "POST", body: "{}" }),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (error) => {
      const code = error instanceof ApiError ? error.code : "internal_error";
      appToast.error(errors.has(code) ? errors(code) : errors("internal_error"));
    },
  });
  const cancelSeries = useMutation({
    mutationFn: () =>
      api(`/v1/brands/${event?.brand_id}/automation/slots/${event?.slot_id}/cancel`, { method: "POST", body: "{}" }),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (error) => {
      const code = error instanceof ApiError ? error.code : "internal_error";
      appToast.error(errors.has(code) ? errors(code) : errors("internal_error"));
    },
  });

  const post = postQuery.data?.post;
  const when = event
    ? format.dateTime(new Date(event.at), { dateStyle: "full", timeStyle: "short", timeZone: zone })
    : "";
  const statusLabel =
    event?.kind === "projection"
      ? t("projection")
      : event && creation.has(`postStatuses.${event.status}`)
        ? creation(`postStatuses.${event.status}`)
        : (event?.status ?? "");
  const image = post?.assets?.find((asset) => asset.url)?.url;
  const networks = (event?.networks ?? []).filter((id): id is SocialNetworkID =>
    NETWORKS.includes(id as SocialNetworkID),
  );
  const rows = integrationsQuery.data?.integrations ?? [];
  const missing = networks.filter((id) => !isConnected(rows.find((row) => row.network === id)));
  const canCancelPost =
    event?.kind === "post" &&
    Boolean(event.publish_at) &&
    event.status !== "published" &&
    event.status !== "publishing" &&
    Boolean(event.post_id);
  const canCancelSeries = Boolean(event?.slot_id) && event?.kind === "projection";
  const flags = post?.quality_flags ?? [];

  return (
    <Sheet
      open={Boolean(event)}
      onOpenChange={(open) => {
        if (!open) {
          setConfirm("");
          onClose();
        }
      }}
    >
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
        {event ? (
          <div className="flex min-h-full flex-col">
            <div className="border-b border-line px-5 pb-4 pt-6 pr-12">
              <SheetHeader className="space-y-1 text-left">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/50">
                  {event.brand_name}
                </p>
                <SheetTitle className="font-display text-left text-lg font-semibold uppercase tracking-tight">
                  {post?.short_title || event.title || event.brand_name}
                </SheetTitle>
                <SheetDescription className="text-left">{when}</SheetDescription>
              </SheetHeader>
            </div>

            {event.kind === "post" && postQuery.isLoading ? (
              <div className="h-48 animate-pulse bg-sand" />
            ) : null}
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={post?.alt_text || ""} className="aspect-[4/5] w-full object-cover" />
            ) : null}
            {event.kind === "post" && post && !image ? (
              <p className="border-b border-line px-5 py-4 text-sm text-ink/60">{t("noMedia")}</p>
            ) : null}

            <div className="space-y-5 px-5 py-5">
              <dl className="grid grid-cols-[6.5rem_1fr] gap-y-2 text-sm">
                <dt className="text-ink/50">{t("statusLabel")}</dt>
                <dd>{statusLabel}</dd>
                {event.approval_status && event.approval_status !== "not_required" ? (
                  <>
                    <dt className="text-ink/50">{t("approvalLabel")}</dt>
                    <dd>{approvalCopy(event.approval_status, creation)}</dd>
                  </>
                ) : null}
                <dt className="text-ink/50">{t("destinations")}</dt>
                <dd className="flex flex-wrap gap-2">
                  {networks.length === 0 ? <span className="text-ink/50">—</span> : null}
                  {networks.map((id) => (
                    <span key={id} className="inline-flex items-center gap-1.5">
                      <SocialNetworkIcon id={id} className="size-3.5" />
                      {creation(`manualPublishNetworks.${id}`)}
                    </span>
                  ))}
                </dd>
              </dl>

              {event.kind === "projection" ? (
                <p className="text-sm leading-relaxed text-ink/75">{t("seriesBody")}</p>
              ) : null}
              {event.kind === "post" && event.slot_id ? (
                <p className="text-sm leading-relaxed text-ink/75">{t("fromSeries")}</p>
              ) : null}

              {post?.caption ? (
                <div className="space-y-1">
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/50">{t("caption")}</h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.caption}</p>
                </div>
              ) : null}

              {flags.length > 0 ? (
                <div className="space-y-1 border-l-2 border-ruby pl-3">
                  <h3 className="text-sm font-medium">{creation("qualityFlagsTitle")}</h3>
                  {flags.map((flag) => (
                    <p key={flag} className="text-sm text-ink/75">
                      {creation.has(`qualityFlags.${flag}`) ? creation(`qualityFlags.${flag}`) : flag}
                    </p>
                  ))}
                </div>
              ) : null}

              {missing.length > 0 && !integrationsQuery.isLoading ? (
                <ul className="space-y-1 border-l-2 border-[var(--chart-3)] pl-3 text-sm">
                  {missing.map((id) => (
                    <li key={id}>{t("disconnected", { network: creation(`manualPublishNetworks.${id}`) })}</li>
                  ))}
                </ul>
              ) : null}

              {(post?.publications ?? []).some((item) => item.error_code) ? (
                <ul className="space-y-1 text-sm text-ink/75">
                  {(post?.publications ?? [])
                    .filter((item) => item.error_code)
                    .map((item) => (
                      <li key={item.network}>
                        {creation(`manualPublishNetworks.${item.network}` as "manualPublishNetworks.linkedin")}:{" "}
                        {errors.has(item.error_code) ? errors(item.error_code) : item.error_code}
                      </li>
                    ))}
                </ul>
              ) : null}
            </div>

            <div className="mt-auto space-y-2 border-t border-line px-5 py-4">
              {confirm === "post" ? (
                <ConfirmRow
                  body={t("cancelPostConfirm")}
                  confirmLabel={t("cancelPost")}
                  pending={cancelPost.isPending}
                  onBack={() => setConfirm("")}
                  onConfirm={() => cancelPost.mutate()}
                />
              ) : null}
              {confirm === "series" ? (
                <ConfirmRow
                  body={t("cancelSeriesConfirm")}
                  confirmLabel={t("cancelSeries")}
                  pending={cancelSeries.isPending}
                  onBack={() => setConfirm("")}
                  onConfirm={() => cancelSeries.mutate()}
                />
              ) : null}
              {confirm === "" && event.kind === "post" && event.post_id ? (
                <Button asChild className="min-h-11 w-full">
                  <Link href={`/posts/${event.post_id}?brand=${event.brand_id}`}>{t("openPost")}</Link>
                </Button>
              ) : null}
              {confirm === "" && canCancelPost ? (
                <Button type="button" variant="outline" className="min-h-11 w-full" onClick={() => setConfirm("post")}>
                  {t("cancelPost")}
                </Button>
              ) : null}
              {confirm === "" && canCancelSeries ? (
                <Button type="button" variant="outline" className={cn("min-h-11 w-full")} onClick={() => setConfirm("series")}>
                  {t("cancelSeries")}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function ConfirmRow({
  body,
  confirmLabel,
  pending,
  onBack,
  onConfirm,
}: {
  body: string;
  confirmLabel: string;
  pending: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations("calendar");
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed">{body}</p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={onBack}>
          {t("back")}
        </Button>
        <Button type="button" className="min-h-11 flex-1" disabled={pending} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}

function approvalCopy(status: string, creation: ReturnType<typeof useTranslations<"creation">>) {
  if (status === "pending") {
    return creation("approvalPending");
  }
  if (status === "approved") {
    return creation("approvalApproved");
  }
  if (status === "rejected") {
    return creation("approvalRejected");
  }
  return status;
}
