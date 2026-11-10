"use client";

import { useQuery } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, XAxis, YAxis } from "recharts";

import { AppShell } from "@/components/app-shell";
import { BrandFilter, CreationFrame, useBrandQuery } from "@/components/creation-screen";
import { addDays, DateRangeFilter, fromYmd, presetRange, toYmd, type PeriodPreset } from "@/components/date-range-filter";
import { formatMetric } from "@/components/post-analytics";
import { SocialNetworkGlyph, SocialNetworkIcon, type SocialNetworkID } from "@/components/social-network-icons";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useAccount } from "@/components/use-account";
import { api, type AnalyticsMetrics, type AnalyticsSummary, type MetricValue } from "@/lib/api";
import { usePresetCopy } from "@/lib/preset-i18n";
import { cn } from "@/lib/utils";

const NETWORKS = ["instagram", "facebook", "linkedin", "tiktok"] as const;
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

function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function numberOf(metric: MetricValue | undefined) {
  return typeof metric?.value === "number" ? metric.value : null;
}

export function PerformanceDashboard() {
  const t = useTranslations("dashboard");
  const metrics = useTranslations("creation");
  const format = useFormatter();
  const presetCopy = usePresetCopy();
  const { organization } = useAccount();
  const { brandId } = useBrandQuery();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tz = useMemo(() => browserTimeZone(), []);

  const fallback = presetRange("30d");
  const from = fromYmd(searchParams.get("from")) ?? fallback.from;
  const toParam = fromYmd(searchParams.get("to")) ?? fallback.to;
  const to = toParam < from ? from : toParam;
  const view = searchParams.get("view") === "network" ? "network" : "overview";
  const requested = searchParams.get("network");
  const network: (typeof NETWORKS)[number] = NETWORKS.includes(requested as (typeof NETWORKS)[number])
    ? (requested as (typeof NETWORKS)[number])
    : "instagram";

  const setParam = (changes: Record<string, string>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const query = useQuery({
    queryKey: ["analytics-summary", organization?.id, brandId || "all", view, view === "network" ? network : "all", toYmd(from), toYmd(to), tz],
    queryFn: () => {
      const params = new URLSearchParams();
      if (brandId) {
        params.set("brand", brandId);
      }
      if (view === "network") {
        params.set("network", network);
      }
      params.set("from", from.toISOString());
      params.set("to", addDays(to, 1).toISOString());
      params.set("tz", tz);
      return api<AnalyticsSummary>(`/v1/organizations/${organization?.id}/analytics?${params.toString()}`);
    },
    enabled: Boolean(organization?.id),
    placeholderData: (previous) => previous,
  });

  const summary = query.data;
  const networks = summary?.networks ?? [];
  const series = summary?.series ?? [];
  const ranking = summary?.ranking ?? [];
  const looks = summary?.looks ?? [];
  const basis = summary?.ranking_basis === "likes" ? "likes" : "engagement";
  const networkNames = Object.fromEntries(NETWORKS.map((id) => [id, metrics(`manualPublishNetworks.${id}`)])) as Record<
    (typeof NETWORKS)[number],
    string
  >;
  const compareRows = networks.map((item) => ({
    network: item.network,
    reach: numberOf(item.metrics.reach) ?? 0,
    likes: numberOf(item.metrics.likes) ?? 0,
    comments: numberOf(item.metrics.comments) ?? 0,
    reachText: formatMetric(item.metrics.reach, format),
    likesText: formatMetric(item.metrics.likes, format),
    commentsText: formatMetric(item.metrics.comments, format),
  }));
  const hasCompare = networks.some(
    (item) => numberOf(item.metrics.reach) != null || numberOf(item.metrics.likes) != null || numberOf(item.metrics.comments) != null,
  );
  const engagementRows = series.map((item) => {
    const row: Record<string, string | number | null> = {
      day: format.dateTime(new Date(`${item.day}T12:00:00`), { day: "numeric", month: "short" }),
    };
    for (const name of NETWORKS) {
      const found = item.networks?.find((entry) => entry.network === name);
      row[name] = numberOf(found?.metrics.engagement);
    }
    return row;
  });
  const engagementNetworks = NETWORKS.filter((name) => engagementRows.some((row) => typeof row[name] === "number"));
  const shownEngagement = view === "network" ? engagementNetworks.filter((name) => name === network) : engagementNetworks;
  const rankRows = ranking.map((item) => ({
    ...item,
    label: item.title.trim() || t("untitled"),
    value: numberOf(basis === "likes" ? item.likes : item.engagement),
  }));
  const lookRows = looks.map((item) => ({
    label:
      item.preset_id === "00000000-0000-0000-0000-000000000000"
        ? t("noLook")
        : presetCopy.name({ name: item.name, style_key: item.style_key }) || t("noLook"),
    value: numberOf(item.average),
    posts: item.posts,
  }));
  const chartConfig = {
    reach: { label: metrics("analyticsMetrics.reach"), color: "var(--chart-1)" },
    likes: { label: metrics("analyticsMetrics.likes"), color: "var(--chart-2)" },
    comments: { label: metrics("analyticsMetrics.comments"), color: "var(--chart-3)" },
    instagram: { label: networkNames.instagram },
    facebook: { label: networkNames.facebook },
    linkedin: { label: networkNames.linkedin },
    tiktok: { label: networkNames.tiktok },
  } satisfies ChartConfig;
  const networkConfig = {
    instagram: { label: metrics("manualPublishNetworks.instagram"), color: "var(--chart-1)" },
    facebook: { label: metrics("manualPublishNetworks.facebook"), color: "var(--chart-2)" },
    linkedin: { label: metrics("manualPublishNetworks.linkedin"), color: "var(--chart-3)" },
    tiktok: { label: metrics("manualPublishNetworks.tiktok"), color: "var(--chart-4)" },
  } satisfies ChartConfig;
  const rankMax = Math.max(...rankRows.map((item) => item.value ?? 0), 1);
  const lookMax = Math.max(...lookRows.map((item) => item.value ?? 0), 1);
  const showLooks = lookRows.some((row) => row.value != null);
  const rate =
    summary?.engagement_rate_bps == null
      ? "—"
      : format.number(summary.engagement_rate_bps / 10000, { style: "percent", maximumFractionDigits: 1 });

  return (
    <AppShell title={t("title")}>
      <CreationFrame>
        <div className="space-y-5">
          <p className="max-w-2xl text-sm leading-relaxed text-ink/70">{t("lead")}</p>

          <div className="space-y-3">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
              <BrandFilter />
              <DateRangeFilter
                from={from}
                to={to}
                onChange={(range) => setParam({ from: toYmd(range.from), to: toYmd(range.to) })}
                periodLabel={t("period")}
                presetLabel={(preset: PeriodPreset) => t(`presets.${preset}`)}
                pickEndLabel={t("pickEnd")}
              />
            </div>
            <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label={t("views")}>
              {(["overview", "network"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={view === item}
                  className={cn(
                    "min-h-11 shrink-0 rounded-full px-4 text-sm",
                    view === item ? "bg-foreground text-background" : "bg-sand text-ink hover:bg-sand/70",
                  )}
                  onClick={() => setParam({ view: item === "overview" ? "" : "network" })}
                >
                  {t(item)}
                </button>
              ))}
            </div>
            {view === "network" ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label={t("network")}>
                {NETWORKS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={network === item}
                    className={cn(
                      "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-3 text-sm",
                      network === item ? "border-foreground bg-foreground text-background" : "border-line bg-card text-ink hover:bg-sand",
                    )}
                    onClick={() => setParam({ view: "network", network: item })}
                  >
                    <SocialNetworkIcon id={item} className="size-4" />
                    {metrics(`manualPublishNetworks.${item}`)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {summary && summary.posts === 0 && !query.isLoading ? (
            <section className="rounded-xl border border-dashed border-line bg-card px-4 py-8 text-center">
              <p className="text-sm text-ink/70">{t("empty")}</p>
            </section>
          ) : (
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label={metrics(basis === "likes" ? "analyticsMetrics.likes" : "analyticsMetrics.engagement")} value={formatMetric(summary?.metrics[basis], format)} strong className="col-span-2 lg:col-span-1" />
              <Stat label={metrics("analyticsMetrics.reach")} value={formatMetric(summary?.metrics.reach, format)} />
              <Stat label={t("rate")} value={rate} />
              <Stat label={t("posts")} value={summary ? format.number(summary.posts) : "—"} />
            </dl>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {view === "overview" && hasCompare ? (
              <Panel title={t("compareTitle")} className="lg:col-span-2">
                <div className="grid gap-4 sm:grid-cols-3">
                  {(["reach", "likes", "comments"] as const).map((key) => (
                    <div key={key} className="min-w-0">
                      <p className="text-xs text-ink/60">{chartConfig[key].label}</p>
                      <ChartContainer config={chartConfig} className="aspect-auto h-28 w-full">
                        <BarChart data={compareRows} layout="vertical" margin={{ left: 0, right: 32, top: 2, bottom: 2 }}>
                          <XAxis type="number" hide domain={[0, (max: number) => (max > 0 ? max : 1)]} />
                          <YAxis
                            type="category"
                            dataKey="network"
                            width={36}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickSize={0}
                            interval={0}
                            tick={(raw) => {
                              const props = raw as { x?: number; y?: number; payload?: { value?: string } };
                              return <NetworkTick x={props.x} y={props.y} payload={props.payload} names={networkNames} />;
                            }}
                          />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                labelFormatter={(_value, payload) => {
                                  const row = payload?.[0]?.payload as { network?: string } | undefined;
                                  const id = row?.network;
                                  return id && id in networkNames ? networkNames[id as SocialNetworkID] : "";
                                }}
                                formatter={(_value, _name, item) => {
                                  const metric = String(item?.dataKey ?? "");
                                  const text = (item?.payload as Record<string, unknown> | undefined)?.[`${metric}Text`];
                                  return typeof text === "string" ? text : "—";
                                }}
                              />
                            }
                          />
                          <Bar dataKey={key} fill={`var(--color-${key})`} radius={4} barSize={12}>
                            <LabelList dataKey={`${key}Text`} position="right" offset={6} fontSize={11} className="fill-foreground" />
                          </Bar>
                        </BarChart>
                      </ChartContainer>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}

            {shownEngagement.length > 0 ? (
              <Panel title={t("engagementByDay")} className="lg:col-span-2">
                {engagementRows.length < 2 ? (
                  <DayBreakdown
                    day={String(engagementRows[0]?.day ?? "")}
                    items={shownEngagement.map((name) => ({
                      id: name,
                      label: metrics(`manualPublishNetworks.${name}`),
                      value: typeof engagementRows[0]?.[name] === "number" ? (engagementRows[0][name] as number) : null,
                      color: networkConfig[name].color,
                    }))}
                    format={format}
                  />
                ) : (
                  <ChartContainer config={networkConfig} className="aspect-auto h-52 w-full">
                    <LineChart data={engagementRows} margin={{ left: 0, right: 12, top: 18, bottom: 0 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} padding={{ left: 24, right: 24 }} />
                      <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} tickMargin={4} />
                      <ChartTooltip content={<MetricTooltip format={format} />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      {shownEngagement.map((name) => (
                        <Line key={name} dataKey={name} type="monotone" stroke={`var(--color-${name})`} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls={false}>
                          <LabelList dataKey={name} position="top" offset={8} fontSize={11} className="fill-foreground" formatter={(value: number | null) => (typeof value === "number" ? format.number(value) : "")} />
                        </Line>
                      ))}
                    </LineChart>
                  </ChartContainer>
                )}
              </Panel>
            ) : null}

            {rankRows.length > 0 ? (
              <Panel title={t("rankTitle")} note={basis === "likes" ? t("rankLeadLikes") : t("rankLead")} className={showLooks ? undefined : "lg:col-span-2"}>
                <ol>
                  {rankRows.map((item, index) => (
                    <li key={item.post_id}>
                      <Link href={`/posts/${item.post_id}?brand=${item.brand_id}`} className="block rounded-lg px-1 py-2.5 hover:bg-sand/70">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="flex min-w-0 items-baseline gap-2">
                            <span className="w-5 shrink-0 text-xs tabular-nums text-ink/45">{index + 1}</span>
                            <span className="truncate text-sm font-medium">{item.label}</span>
                          </span>
                          <span className="shrink-0 text-sm font-semibold tabular-nums">{formatMetric(basis === "likes" ? item.likes : item.engagement, format)}</span>
                        </span>
                        <span className="mt-2 flex items-center gap-3 pl-7">
                          <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-sand">
                            <span className="block h-full rounded-full bg-pine" style={{ width: `${((item.value ?? 0) / rankMax) * 100}%` }} />
                          </span>
                          <span className="flex shrink-0 gap-1.5 text-ink/70" aria-label={item.networks.map((name) => metrics(`manualPublishNetworks.${name as SocialNetworkID}`)).join(", ")}>
                            {item.networks.map((name) => (
                              <SocialNetworkIcon key={name} id={name as SocialNetworkID} className="size-3.5" />
                            ))}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </Panel>
            ) : null}

            {showLooks ? (
              <Panel title={t("lookTitle")} note={t("lookLead")} className={rankRows.length > 0 ? undefined : "lg:col-span-2"}>
                <ul>
                  {lookRows.map((item, index) => (
                    <li key={`${item.label}-${index}`} className="px-1 py-2.5">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="flex min-w-0 items-baseline gap-2">
                          <span className="w-5 shrink-0 text-xs tabular-nums text-ink/45">{index + 1}</span>
                          <span className="truncate text-sm font-medium text-ink">{item.label}</span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">{item.value == null ? "—" : format.number(item.value)}</span>
                      </span>
                      <span className="mt-2 flex items-center gap-3 pl-7">
                        <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-sand">
                          <span className="block h-full rounded-full" style={{ width: `${((item.value ?? 0) / lookMax) * 100}%`, background: "var(--chart-2)" }} />
                        </span>
                        <span className="shrink-0 text-[11px] text-ink/55">{t("lookPosts", { count: item.posts })}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}
          </div>

          {summary && summary.posts > 0 ? (
            <Panel title={t("allMetrics")}>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
                {metricOrder.map((code) => (
                  <div key={code} className="min-w-0 border-t border-line pt-2">
                    <dt className="truncate text-[11px] text-ink/55">{metrics(`analyticsMetrics.${code}`)}</dt>
                    <dd className="text-sm font-medium tabular-nums">{formatMetric(summary.metrics[code], format)}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          ) : null}
        </div>
      </CreationFrame>
    </AppShell>
  );
}

function DayBreakdown({
  day,
  items,
  format,
}: {
  day: string;
  items: { id: string; label: string; value: number | null; color: string }[];
  format: ReturnType<typeof useFormatter>;
}) {
  const max = Math.max(...items.map((item) => item.value ?? 0), 1);
  return (
    <div>
      {day ? <p className="text-xs text-ink/55">{day}</p> : null}
      <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <li key={item.id} className="min-w-0">
            <span className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <SocialNetworkIcon id={item.id as SocialNetworkID} className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{item.value == null ? "—" : format.number(item.value)}</span>
            </span>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-sand">
              <span className="block h-full rounded-full" style={{ width: `${((item.value ?? 0) / max) * 100}%`, background: item.color }} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NetworkTick({
  x = 0,
  y = 0,
  payload,
  names,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  names: Record<string, string>;
}) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const id = String(payload?.value ?? "");
  const name = names[id] ?? id;
  const known = (NETWORKS as readonly string[]).includes(id);
  if (!known) {
    return (
      <text x={x} y={y} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-[11px]">
        {name}
      </text>
    );
  }
  return (
    <g
      transform={`translate(${x},${y})`}
      role="img"
      aria-label={name}
      onMouseEnter={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        setTip({ x: box.right + 8, y: box.top + box.height / 2 });
      }}
      onMouseLeave={() => setTip(null)}
    >
      <rect x={-20} y={-12} width={24} height={24} fill="transparent" />
      <g transform="translate(-16,-8) scale(0.6667)" className="text-ink/70">
        <SocialNetworkGlyph id={id as SocialNetworkID} />
      </g>
      {tip && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed z-50 -translate-y-1/2 whitespace-nowrap rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground shadow-xl"
              style={{ left: tip.x, top: tip.y }}
              aria-hidden
            >
              {name}
            </div>,
            document.body,
          )
        : null}
    </g>
  );
}

function Panel({ title, note, className, children }: { title: string; note?: string; className?: string; children: ReactNode }) {
  return (
    <section className={cn("min-w-0 rounded-xl border border-line bg-card p-4 md:p-5", className)}>
      <h2 className="text-sm font-semibold">{title}</h2>
      {note ? <p className="mt-1 text-sm leading-relaxed text-ink/60">{note}</p> : null}
      <div className={note ? "mt-4" : "mt-3"}>{children}</div>
    </section>
  );
}

function MetricTooltip({ format }: { format: ReturnType<typeof useFormatter> }) {
  return <ChartTooltipContent formatter={(value) => (value == null || value === "" ? "—" : format.number(Number(value)))} />;
}

function Stat({ label, value, strong, className }: { label: string; value: string; strong?: boolean; className?: string }) {
  return (
    <div className={cn("min-w-0 rounded-xl border border-line bg-card p-4", className)}>
      <dt className="text-xs text-ink/60">{label}</dt>
      <dd className={cn("mt-1 truncate tabular-nums", strong ? "text-3xl font-semibold text-pine" : "text-xl font-semibold")}>{value}</dd>
    </div>
  );
}
