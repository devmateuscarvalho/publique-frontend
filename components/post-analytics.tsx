"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ApiError, api, type AnalyticsMetrics, type MetricValue, type PostAnalyticsPublication } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import { cn } from "@/lib/utils";

const metricOrder: (keyof AnalyticsMetrics)[] = [
  "reach",
  "views",
  "impressions",
  "likes",
  "comments",
  "shares",
  "saves",
  "engagement",
  "profile_visits",
  "link_clicks",
  "video_watch_time_ms",
];

export function PostAnalytics({
  brandId,
  postId,
  onReconnect,
}: {
  brandId: string;
  postId: string;
  onReconnect: (network: "linkedin" | "instagram" | "facebook" | "tiktok") => void;
}) {
  const t = useTranslations("creation");
  const errors = useTranslations("errors");
  const format = useFormatter();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["post-analytics", brandId, postId],
    queryFn: () =>
      api<{ publications: PostAnalyticsPublication[] }>(`/v1/brands/${brandId}/posts/${postId}/analytics`),
    enabled: Boolean(brandId && postId),
  });
  const refresh = useMutation({
    mutationFn: () =>
      api<{ publications: PostAnalyticsPublication[] }>(`/v1/brands/${brandId}/posts/${postId}/analytics/refresh`, {
        method: "POST",
        body: "{}",
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["post-analytics", brandId, postId], data);
      void queryClient.invalidateQueries({ queryKey: ["analytics-latest"] });
    },
    onError: (error) => {
      const code = error instanceof ApiError ? error.code : "";
      appToast.error(errors(code === "rate_limited" ? "rate_limited" : "internal_error"));
    },
  });
  const publications = query.data?.publications ?? [];
  const [network, setNetwork] = useState(publications[0]?.network ?? "");
  const [open, setOpen] = useState(false);
  const item = publications.find((entry) => entry.network === network) ?? publications[0];
  if (query.isLoading || !item) {
    return null;
  }

  return (
    <details className="group" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-4 [&::-webkit-details-marker]:hidden">
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink/45">{t("analyticsTitle")}</span>
        <ChevronDown className="ml-auto size-4 text-ink/45 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <section className="space-y-4 px-4 pb-4">
      <div>
        <p className="text-xs leading-relaxed text-ink/55">{t("analyticsLead")}</p>
      </div>
      <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label={t("analyticsTitle")}>
        {publications.map((entry) => {
          const selected = entry.network === item.network;
          return (
            <button
              key={entry.network}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setNetwork(entry.network)}
              className={cn(
                "min-h-11 shrink-0 rounded-full px-3 text-xs font-medium transition-colors",
                selected ? "bg-foreground text-background" : "text-ink/60 hover:bg-muted",
              )}
            >
              {t(`manualPublishNetworks.${entry.network}`)}
            </button>
          );
        })}
      </div>
      <div className="space-y-3">
        {item.last_collected_at ? (
          <p className="text-xs text-ink/55">
            {t("analyticsUpdated", {
              date: format.dateTime(new Date(item.last_collected_at), { dateStyle: "medium", timeStyle: "short" }),
            })}
          </p>
        ) : (
          <p className="text-xs text-ink/55">{t("analyticsPending")}</p>
        )}
        {item.media_kind === "story" ? <p className="text-xs leading-relaxed text-ink/55">{t("analyticsStoryWindow")}</p> : null}
        {item.error_code === "permission_required" ||
        item.error_code === "token_expired" ||
        item.error_code === "integration_unconfigured" ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            onClick={() => onReconnect(item.network as "linkedin" | "instagram" | "facebook" | "tiktok")}
          >
            {t("analyticsReconnect", { network: t(`manualPublishNetworks.${item.network}`) })}
          </Button>
        ) : null}
        <dl className="grid grid-cols-2 gap-x-4">
          {metricOrder.map((code) => (
            <div key={code} className="flex items-baseline justify-between gap-2 border-t border-input py-2">
              <dt className="text-xs text-ink/50">{t(`analyticsMetrics.${code}`)}</dt>
              <dd className="text-sm font-medium tabular-nums">{formatMetric(item.metrics?.[code], format)}</dd>
            </div>
          ))}
        </dl>
        {item.engagement_rate_bps != null ? (
          <p className="text-sm text-ink/80">
            {t("analyticsRate", {
              value: format.number(item.engagement_rate_bps / 10000, {
                style: "percent",
                maximumFractionDigits: 1,
              }),
            })}
          </p>
        ) : null}
        <ReachChart points={item.series ?? []} />
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full"
          disabled={refresh.isPending}
          onClick={() => refresh.mutate()}
        >
          {refresh.isPending ? t("analyticsRefreshing") : t("analyticsRefresh")}
        </Button>
      </div>
      </section>
    </details>
  );
}

export function formatMetric(metric: MetricValue | undefined, format: ReturnType<typeof useFormatter>) {
  if (!metric || typeof metric.value !== "number") {
    return "—";
  }
  return format.number(metric.value);
}

function ReachChart({ points }: { points: PostAnalyticsPublication["series"] }) {
  const t = useTranslations("creation");
  const data = points
    .filter((point) => point.status === "collected" && typeof point.metrics?.reach?.value === "number")
    .map((point) => ({
      slot: t.has(`analyticsSlots.${point.slot}`) ? t(`analyticsSlots.${point.slot}`) : point.slot,
      reach: point.metrics.reach?.value ?? 0,
    }));
  if (data.length < 2) {
    return null;
  }
  const config = {
    reach: { label: t("analyticsMetrics.reach"), color: "var(--chart-1)" },
  } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className={cn("aspect-auto h-36 w-full")}>
      <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="slot" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis hide />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line dataKey="reach" type="monotone" stroke="var(--color-reach)" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ChartContainer>
  );
}
