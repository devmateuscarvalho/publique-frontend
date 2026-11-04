"use client";

import { CalendarDays, Play, Search, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { useBrandQuery } from "@/components/creation-screen";
import { SocialNetworkIcon } from "@/components/social-network-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type LatestAnalyticsItem, type Post } from "@/lib/api";
import { usePresetCopy } from "@/lib/preset-i18n";
import {
  laneCounts,
  postMatchesQuery,
  queueIsStory,
  queueIsVideo,
  queueNetworks,
  queuePreview,
  queueSections,
  queueSignal,
  queueSlideCount,
  queueWhen,
  type QueueLane,
  type QueueSignal,
} from "@/lib/post-queue";
import { cn } from "@/lib/utils";

const LANES = ["all", "attention", "progress", "scheduled", "drafts", "published"] as const;

const signalClass: Record<QueueSignal, string> = {
  failed: "bg-destructive/10 text-destructive",
  rejected: "bg-destructive/10 text-destructive",
  overdue: "bg-amber-500/15 text-amber-950 dark:text-amber-100",
  due: "bg-amber-500/15 text-amber-950 dark:text-amber-100",
  needsApproval: "bg-blush text-[#1f1f1f]",
  photoReady: "bg-blush text-[#1f1f1f]",
  review: "bg-blush text-[#1f1f1f]",
  scheduled: "bg-sand text-ink",
  creating: "bg-sand text-ink",
  publishing: "bg-sand text-ink",
  published: "bg-sage/80 text-[#1f1f1f]",
  draft: "border border-line text-ink/70",
};

export function PostFeed({
  posts,
  pending,
  fetching,
  error,
  capped,
  asOf,
  serverFiltering,
  onRetry,
  onClear,
  brandNameOf,
  logoOf,
  performanceOf,
  filters,
}: {
  posts: Post[];
  pending: boolean;
  fetching: boolean;
  error: boolean;
  capped: boolean;
  asOf: number;
  serverFiltering: boolean;
  onRetry: () => void;
  onClear: () => void;
  brandNameOf: (id?: string) => string;
  logoOf: (id?: string) => string | undefined;
  performanceOf: (id: string) => LatestAnalyticsItem[] | undefined;
  filters?: ReactNode;
}) {
  const t = useTranslations("creation");
  const lists = useTranslations("lists");
  const format = useFormatter();
  const presetCopy = usePresetCopy();
  const { brandId } = useBrandQuery();
  const { q, setQ, lane, setLane } = useQueueQuery();
  const now = asOf > 0 ? asOf : 0;
  const searched = posts.filter((post) =>
    postMatchesQuery(
      post,
      q,
      [
        brandNameOf(post.brand_id),
        post.preset
          ? presetCopy.name({ name: post.preset.name, style_key: post.preset.style_key })
          : "",
        t(post.origin === "automation" ? "originAutomation" : "originManual"),
        t(`queueSignals.${queueSignal(post, now)}`),
      ].join(" "),
    ),
  );
  const counts = laneCounts(searched, now);
  const sections = queueSections(searched, lane, now);
  const constrained = serverFiltering || Boolean(q);
  const calendarHref = brandId ? `/calendar?brand=${encodeURIComponent(brandId)}` : "/calendar";

  useEffect(() => {
    const tab = document.getElementById(`post-lane-${lane}`);
    const scroller = tab?.parentElement;
    if (!tab || !scroller) {
      return;
    }
    const tabBox = tab.getBoundingClientRect();
    const box = scroller.getBoundingClientRect();
    scroller.scrollBy({ left: tabBox.left - box.left - (box.width - tabBox.width) / 2 });
  }, [lane]);

  let empty: { message: string; action: "create" | "clear" | "none" } | null = null;
  if (!pending && !error) {
    if (posts.length === 0) {
      empty = { message: serverFiltering ? t("manualNoResults") : t("manualEmpty"), action: serverFiltering ? "clear" : "create" };
    } else if (searched.length === 0) {
      empty = { message: t("manualNoResults"), action: "clear" };
    } else if (sections.length === 0 && lane !== "all") {
      empty = { message: t(`queueEmpty.${lane}`), action: q || serverFiltering ? "clear" : "none" };
    }
  }

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm leading-relaxed text-ink/70">{t("manualLead")}</p>

      <div className="space-y-3">
        <div className="relative">
          <Label htmlFor="post-queue-search" className="sr-only">
            {t("queueSearch")}
          </Label>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id="post-queue-search"
            value={q}
            placeholder={t("queueSearch")}
            onChange={(event) => setQ(event.target.value)}
            className="h-11 rounded-full border-transparent bg-muted pr-11 pl-10 shadow-none"
          />
          {q ? (
            <button
              type="button"
              className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
              onClick={() => setQ("")}
              aria-label={lists("clearSearch")}
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>

        {filters ? (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
            {filters}
          </div>
        ) : null}

        <div className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0" role="tablist" aria-label={t("queueLanesLabel")}>
          {LANES.map((item) => {
            const active = lane === item;
            return (
              <button
                key={item}
                id={`post-lane-${item}`}
                type="button"
                role="tab"
                aria-selected={active}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm",
                  active ? "bg-foreground text-background" : "bg-sand text-ink hover:bg-sand/70",
                )}
                onClick={() => setLane(item)}
              >
                {t(`queueLanes.${item}`)}
                {pending ? null : (
                  <span className={cn("text-xs tabular-nums", active ? "text-background/70" : "text-ink/45")}>{counts[item]}</span>
                )}
              </button>
            );
          })}
        </div>

        {constrained ? (
          <button
            type="button"
            className="inline-flex min-h-11 items-center text-sm text-ink/70 underline-offset-4 hover:underline"
            onClick={onClear}
          >
            {t("queueClear")}
          </button>
        ) : null}
        {lane === "scheduled" ? (
          <p className="text-xs leading-relaxed text-ink/55">
            {t("queueScheduleNote")}{" "}
            <Link href={calendarHref} className="font-medium text-ink underline-offset-4 hover:underline">
              {t("queueOpenCalendar")}
            </Link>
          </p>
        ) : null}
        {capped ? <p className="text-xs text-ink/45">{t("queueCap")}</p> : null}
      </div>

      {pending ? <QueueSkeleton /> : null}

      {error && !pending ? (
        <div className="rounded-xl border border-dashed border-line bg-card px-4 py-8 text-center">
          <p className="text-sm text-ink/70">{t("queueLoadError")}</p>
          <Button type="button" variant="outline" className="mt-4" onClick={onRetry}>
            {t("queueRetry")}
          </Button>
        </div>
      ) : null}

      {empty ? (
        <div className="rounded-xl border border-dashed border-line bg-card px-4 py-10 text-center">
          <p className="text-sm text-ink/70">{empty.message}</p>
          {empty.action === "create" ? (
            <Link href="/create" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">
              {t("queueCreate")}
            </Link>
          ) : null}
          {empty.action === "clear" ? (
            <Button type="button" variant="outline" className="mt-4" onClick={onClear}>
              {t("queueClear")}
            </Button>
          ) : null}
        </div>
      ) : null}

      {!pending && !error && !empty ? (
        <div id="post-queue" className={cn("space-y-6", fetching && "opacity-70 transition-opacity")} aria-busy={fetching}>
          {sections.map((section) => (
            <section key={section.lane} className="space-y-2">
              {lane === "all" ? (
                <div className="flex items-baseline justify-between gap-3 px-1">
                  <h2 className="text-sm font-semibold">{t(`queueSections.${section.lane}`)}</h2>
                  <span className="text-xs tabular-nums text-ink/45">{counts[section.lane]}</span>
                </div>
              ) : null}
              <div className="overflow-hidden rounded-xl border border-line bg-card">
                {section.groups.map((group, index) => (
                  <div key={group.dayKey || section.lane}>
                    {group.at ? (
                      <div className={cn("border-b border-line bg-sand/40 px-3 py-2 text-xs font-medium text-ink/60", index > 0 && "border-t")}>
                        {dayLabel(group.at, format, t)}
                      </div>
                    ) : null}
                    <ul className="divide-y divide-line">
                      {group.posts.map((item) => (
                        <PostRow
                          key={item.id}
                          post={item}
                          now={now}
                          brandName={brandNameOf(item.brand_id)}
                          logoUrl={logoOf(item.brand_id)}
                          performance={item.status === "published" ? performanceOf(item.id) : undefined}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PostRow({
  post,
  now,
  brandName,
  logoUrl,
  performance,
}: {
  post: Post;
  now: number;
  brandName: string;
  logoUrl?: string;
  performance?: LatestAnalyticsItem[];
}) {
  const t = useTranslations("creation");
  const format = useFormatter();
  const presetCopy = usePresetCopy();
  const signal = queueSignal(post, now);
  const when = queueWhen(post, now);
  const image = queuePreview(post);
  const story = queueIsStory(post);
  const slides = queueSlideCount(post);
  const video = queueIsVideo(image);
  const planned = post.status === "published" ? [] : queueNetworks(post.automation_networks);
  const caption = post.caption?.trim() || post.short_title?.trim() || "";
  const title = caption || (signal === "creating" || signal === "publishing" ? t("queueCreatingTitle") : t("manualUntitled"));
  const presetLabel = post.preset
    ? presetCopy.name({ name: post.preset.name, style_key: post.preset.style_key }) + (post.preset.version ? ` v${post.preset.version}` : "")
    : "";
  const meta = [brandName, presetLabel, post.content_pillar ?? "", post.origin === "automation" ? t("originAutomation") : ""]
    .filter(Boolean)
    .join(" · ");
  const whenDate = when ? new Date(when.iso) : null;
  const whenLabel = whenDate && !Number.isNaN(whenDate.getTime())
    ? format.dateTime(whenDate, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";
  const metrics = (performance ?? []).filter(
    (item) => typeof item.reach?.value === "number" || typeof item.likes?.value === "number",
  );

  return (
    <li>
      <Link
        href={`/posts/${post.id}?brand=${post.brand_id || ""}`}
        className="flex gap-3 px-3 py-3 transition-colors hover:bg-sand/50 focus-visible:bg-sand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <div className="relative size-[4.5rem] shrink-0 overflow-hidden rounded-lg bg-sand">
          {image?.url && video ? (
            <video src={image.url} muted playsInline preload="metadata" className="pointer-events-none size-full object-cover" />
          ) : image?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image.url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center">
              {signal === "creating" || signal === "publishing" ? (
                <span className="size-2 animate-pulse rounded-full bg-ink/40" aria-hidden />
              ) : null}
            </span>
          )}
          {video ? (
            <span className="absolute inset-0 flex items-center justify-center bg-ink/20">
              <Play className="size-4 fill-white text-white" aria-hidden />
              <span className="sr-only">{t("queueVideo")}</span>
            </span>
          ) : null}
          {story || slides > 1 ? (
            <span className="absolute right-1 bottom-1 flex gap-1">
              {story ? (
                <span className="rounded bg-[#1f1f1f]/80 px-1 py-px text-[10px] font-medium text-white">{t("queueStory")}</span>
              ) : null}
              {slides > 1 ? (
                <span className="rounded bg-[#1f1f1f]/80 px-1 py-px text-[10px] font-medium tabular-nums text-white" aria-label={t("queueSlides", { count: slides })}>
                  {slides}
                </span>
              ) : null}
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className={cn("min-w-0 flex-1 text-sm leading-snug", caption ? "line-clamp-2 font-medium" : "text-ink/55")}>{title}</p>
            <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium leading-5", signalClass[signal])}>
              {signal === "creating" || signal === "publishing" ? <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden /> : null}
              {t(`queueSignals.${signal}`)}
            </span>
          </div>
          {meta ? (
            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-ink/55">
              <BrandMark name={brandName} logoUrl={logoUrl} />
              <span className="truncate">{meta}</span>
            </p>
          ) : null}
          {whenLabel || planned.length > 0 || metrics.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/60">
              {when && whenLabel ? (
                <span className="inline-flex items-center gap-1">
                  <span className="sr-only">{t(`queueWhen.${when.kind}`)}</span>
                  {when.kind === "scheduled" ? <CalendarDays className="size-3.5 shrink-0" aria-hidden /> : null}
                  <time dateTime={when.iso}>{whenLabel}</time>
                </span>
              ) : null}
              {planned.length > 0 ? (
                <span
                  className="inline-flex items-center gap-1"
                  aria-label={t("queueGoesTo", {
                    networks: planned.map((id) => t(`manualPublishNetworks.${id}`)).join(", "),
                  })}
                >
                  {planned.map((id) => (
                    <SocialNetworkIcon key={id} id={id} className="size-3.5" />
                  ))}
                </span>
              ) : null}
              {metrics.length > 0 ? <ReachLine items={metrics} /> : null}
            </div>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

function ReachLine({ items }: { items: LatestAnalyticsItem[] }) {
  const t = useTranslations("creation");
  const format = useFormatter();
  const rows = items.flatMap((item) => {
    const network = queueNetworks([item.network])[0];
    if (!network) {
      return [];
    }
    const reach = typeof item.reach?.value === "number" ? item.reach.value : null;
    const likes = typeof item.likes?.value === "number" ? item.likes.value : null;
    if (reach == null && likes == null) {
      return [];
    }
    return [{ network, reach, likes }];
  });
  if (rows.length === 0) {
    return null;
  }
  const lead = [...rows].sort((a, b) => (b.reach ?? b.likes ?? 0) - (a.reach ?? a.likes ?? 0))[0];
  const others = rows.filter((row) => row.network !== lead.network);
  const reach = lead.reach == null ? null : format.number(lead.reach);
  const likes = lead.likes == null ? null : format.number(lead.likes);
  const detail = rows
    .map((row) => {
      const bits = [
        row.reach == null ? "" : t("analyticsChipReach", { value: format.number(row.reach) }),
        row.likes == null ? "" : t("analyticsChipLikes", { value: format.number(row.likes) }),
      ].filter(Boolean);
      return `${t(`manualPublishNetworks.${row.network}`)} ${bits.join(", ")}`;
    })
    .join(". ");
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={detail}>
      <SocialNetworkIcon id={lead.network} className="size-3.5" />
      <span>
        {reach != null ? t("analyticsChipReach", { value: reach }) : ""}
        {reach != null && likes != null ? " · " : ""}
        {likes != null ? t("analyticsChipLikes", { value: likes }) : ""}
      </span>
      {others.map((row) => (
        <SocialNetworkIcon key={row.network} id={row.network} className="size-3.5 opacity-70" />
      ))}
    </span>
  );
}

function BrandMark({ name, logoUrl }: { name: string; logoUrl?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | undefined>();
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  const failed = Boolean(logoUrl) && failedUrl === logoUrl;
  return (
    <span className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sand text-[10px] font-semibold text-ink/80">
      {logoUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-full object-contain p-0.5" onError={() => setFailedUrl(logoUrl)} />
      ) : (
        initial
      )}
    </span>
  );
}

function QueueSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card" aria-hidden>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex gap-3 border-b border-line px-3 py-3 last:border-b-0">
          <div className="size-[4.5rem] animate-pulse rounded-lg bg-sand" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 w-4/5 animate-pulse rounded bg-sand" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-sand" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-sand" />
          </div>
        </div>
      ))}
    </div>
  );
}

function dayLabel(iso: string, format: ReturnType<typeof useFormatter>, t: (key: string) => string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const start = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diff = Math.round((start(date) - start(new Date())) / 86_400_000);
  if (diff === 0) {
    return t("queueToday");
  }
  if (diff === 1) {
    return t("queueTomorrow");
  }
  if (diff === -1) {
    return t("queueYesterday");
  }
  return format.dateTime(date, { weekday: "short", day: "numeric", month: "short" });
}

function useQueueQuery() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const q = params.get("q") ?? "";
  const laneRaw = params.get("lane") ?? "";
  const lane: (typeof LANES)[number] = (LANES as readonly string[]).includes(laneRaw) ? (laneRaw as (typeof LANES)[number]) : "all";
  const [draft, setDraft] = useState(q);
  const [seenQ, setSeenQ] = useState(q);
  if (q !== seenQ) {
    setSeenQ(q);
    setDraft(q);
  }

  const replace = useCallback(
    (next: Record<string, string | null>) => {
      const search = new URLSearchParams(params.toString());
      for (const [name, value] of Object.entries(next)) {
        if (!value) {
          search.delete(name);
        } else {
          search.set(name, value);
        }
      }
      const query = search.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  useEffect(() => {
    if (draft === q) {
      return;
    }
    const handle = window.setTimeout(() => replace({ q: draft }), 300);
    return () => window.clearTimeout(handle);
  }, [draft, q, replace]);

  return {
    q: draft,
    setQ: setDraft,
    lane,
    setLane: (value: QueueLane | "all") => replace({ lane: value === "all" ? null : value }),
  };
}
