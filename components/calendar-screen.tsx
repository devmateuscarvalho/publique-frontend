"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { AppShell } from "@/components/app-shell";
import { CalendarInspector, type CalendarEvent } from "@/components/calendar-inspector";
import { BrandFilter, CreationFrame, useBrandQuery } from "@/components/creation-screen";
import { useCreationBrand } from "@/components/creation-brand";
import { SocialNetworkIcon, type SocialNetworkID } from "@/components/social-network-icons";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/components/use-account";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const NETWORKS = ["linkedin", "instagram", "facebook", "tiktok"] as const;
type View = "week" | "month" | "agenda";
type Focus = "all" | "published" | "scheduled" | "pending" | "attention" | "series";

function isISODate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function zonedISO(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function utcNoon(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function addDays(iso: string, days: number) {
  const date = utcNoon(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function mondayOf(iso: string) {
  const date = utcNoon(iso);
  const weekday = date.getUTCDay();
  const delta = weekday === 0 ? 6 : weekday - 1;
  date.setUTCDate(date.getUTCDate() - delta);
  return date.toISOString().slice(0, 10);
}

function shiftMonth(iso: string, delta: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1 + delta, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day, last));
  return first.toISOString().slice(0, 10);
}

function monthCells(cursor: string) {
  const [year, month] = cursor.split("-").map(Number);
  const first = `${year}-${pad(month)}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const last = `${year}-${pad(month)}-${pad(lastDay)}`;
  const start = mondayOf(first);
  const end = addDays(mondayOf(last), 6);
  const cells: string[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) {
    cells.push(day);
  }
  return cells;
}

function mondaysBetween(start: string, end: string) {
  const days: string[] = [];
  for (let day = mondayOf(start); day <= end; day = addDays(day, 7)) {
    days.push(day);
  }
  return days;
}

function isoWeekday(iso: string) {
  const weekday = utcNoon(iso).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

function eventKey(event: CalendarEvent) {
  return `${event.kind}:${event.post_id ?? ""}:${event.slot_id ?? ""}:${event.at}`;
}

function toneOf(event: CalendarEvent): Exclude<Focus, "all"> | "draft" {
  if (event.kind === "projection") {
    return "series";
  }
  if (event.status === "published") {
    return "published";
  }
  if (event.status === "failed" || event.approval_status === "rejected") {
    return "attention";
  }
  if (event.approval_status === "pending") {
    return "pending";
  }
  if (event.publish_at && event.status !== "publishing") {
    return "scheduled";
  }
  if (event.status === "publishing") {
    return "scheduled";
  }
  return "draft";
}

function toneColor(tone: ReturnType<typeof toneOf>) {
  if (tone === "published") {
    return "var(--sage)";
  }
  if (tone === "scheduled") {
    return "var(--chart-4)";
  }
  if (tone === "pending") {
    return "var(--chart-3)";
  }
  if (tone === "attention") {
    return "var(--ruby)";
  }
  if (tone === "series") {
    return "var(--ink)";
  }
  return "var(--line)";
}

export function CalendarScreen() {
  const t = useTranslations("calendar");
  const creation = useTranslations("creation");
  const format = useFormatter();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organization } = useAccount();
  const { brands } = useCreationBrand();
  const { brandId } = useBrandQuery();
  const [opened, setOpened] = useState<CalendarEvent | null>(null);
  const [focus, setFocus] = useState<Focus>("all");
  const [network, setNetwork] = useState<SocialNetworkID | "">("");

  const zone =
    brands.find((brand) => brand.id === brandId)?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC";
  const viewParam = searchParams.get("view");
  const view: View = viewParam === "month" || viewParam === "agenda" ? viewParam : "week";
  const today = zonedISO(new Date(), zone);
  const cursor = isISODate(searchParams.get("cursor")) ? (searchParams.get("cursor") as string) : today;

  const weekDays = [0, 1, 2, 3, 4, 5, 6].map((offset) => addDays(mondayOf(cursor), offset));
  const cells = view === "month" ? monthCells(cursor) : weekDays;
  const periodDays =
    view === "month" ? cells.filter((day) => day.slice(0, 7) === cursor.slice(0, 7)) : weekDays;
  const weeks = mondaysBetween(cells[0], cells[cells.length - 1]);

  const calendarQuery = useQuery({
    queryKey: ["calendar", organization?.id, brandId, weeks.join(",")],
    queryFn: async () => {
      const pages = await Promise.all(
        weeks.map((week) => {
          const query = new URLSearchParams({ week });
          if (brandId) {
            query.set("brand", brandId);
          }
          return api<{ events: CalendarEvent[] }>(
            `/v1/organizations/${organization?.id}/calendar?${query.toString()}`,
          );
        }),
      );
      const seen = new Set<string>();
      const events: CalendarEvent[] = [];
      for (const page of pages) {
        for (const event of page.events ?? []) {
          const key = eventKey(event);
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          events.push(event);
        }
      }
      return events;
    },
    enabled: Boolean(organization?.id),
  });

  const replaceQuery = (patch: Record<string, string>) => {
    const search = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      search.set(key, value);
    }
    const query = search.toString();
    router.replace(query ? `/calendar?${query}` : "/calendar", { scroll: false });
  };

  const events = calendarQuery.data ?? [];
  const onCivilDay = (event: CalendarEvent) => zonedISO(new Date(event.at), zone);
  const matchesNetwork = (event: CalendarEvent) => !network || event.networks.includes(network);
  const gridDays = view === "month" ? cells : weekDays;
  const periodEvents = events.filter((event) => periodDays.includes(onCivilDay(event)) && matchesNetwork(event));
  const dated = events.filter((event) => gridDays.includes(onCivilDay(event)));
  const visible = dated.filter(
    (event) => matchesNetwork(event) && (focus === "all" || toneOf(event) === focus),
  );

  const counts: Record<Exclude<Focus, "all">, number> = {
    published: 0,
    scheduled: 0,
    pending: 0,
    attention: 0,
    series: 0,
  };
  for (const event of periodEvents) {
    const tone = toneOf(event);
    if (tone !== "draft") {
      counts[tone] += 1;
    }
  }

  const onDay = (list: CalendarEvent[], day: string) =>
    list.filter((event) => zonedISO(new Date(event.at), zone) === day).sort((a, b) => a.at.localeCompare(b.at));
  const byDay = (day: string) => onDay(visible, day);
  const rawDay = (day: string) => onDay(dated, day);

  const createHref = (day: string) => {
    const query = new URLSearchParams();
    if (brandId) {
      query.set("brand", brandId);
    }
    query.set("on", day);
    query.set("at", "09:00");
    return `/create?${query.toString()}`;
  };

  const periodLabel =
    view === "month"
      ? format.dateTime(utcNoon(cursor), { month: "long", year: "numeric", timeZone: "UTC" })
      : `${format.dateTime(utcNoon(weekDays[0]), { day: "numeric", month: "short", timeZone: "UTC" })} – ${format.dateTime(utcNoon(weekDays[6]), { day: "numeric", month: "short", timeZone: "UTC" })}`;

  const shift = (direction: -1 | 1) => {
    replaceQuery({ cursor: view === "month" ? shiftMonth(cursor, direction) : addDays(cursor, direction * 7) });
  };

  return (
    <AppShell title={t("title")} fluid>
      <CreationFrame>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 border-b border-line pb-3">
            <p className="max-w-2xl text-sm text-ink/65">{t("lead", { zone })}</p>
            <BrandFilter />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="icon" aria-label={t("previous")} onClick={() => shift(-1)}>
                <ChevronLeft />
              </Button>
              <Button type="button" variant="ghost" className="min-h-11" onClick={() => replaceQuery({ cursor: today })}>
                {t("today")}
              </Button>
              <p className="min-w-40 flex-1 text-center text-sm font-medium">{periodLabel}</p>
              <Button type="button" variant="outline" size="icon" aria-label={t("next")} onClick={() => shift(1)}>
                <ChevronRight />
              </Button>
              <div className="flex border border-line" role="tablist" aria-label={t("views")}>
                {(["week", "month", "agenda"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    aria-selected={view === item}
                    className={cn(
                      "min-h-11 px-3 text-sm",
                      view === item ? "bg-foreground text-background" : "bg-background text-ink/70",
                    )}
                    onClick={() => replaceQuery({ view: item })}
                  >
                    {t(item)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-1">
              {(["published", "scheduled", "pending", "attention", "series"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={focus === item}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 border-b-2 px-2 text-sm",
                    focus === item ? "border-foreground text-ink" : "border-transparent text-ink/60",
                  )}
                  onClick={() => setFocus(focus === item ? "all" : item)}
                >
                  <span className="size-2 shrink-0" style={{ background: toneColor(item) }} aria-hidden />
                  <span className="tabular-nums">{counts[item]}</span>
                  {t(item)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label={t("networks")}>
              <button
                type="button"
                aria-pressed={network === ""}
                className={cn("min-h-11 px-2 text-sm", network === "" ? "text-ink" : "text-ink/50")}
                onClick={() => setNetwork("")}
              >
                {t("allNetworks")}
              </button>
              {NETWORKS.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={network === id}
                  aria-label={creation(`manualPublishNetworks.${id}`)}
                  className={cn(
                    "inline-flex size-11 items-center justify-center border",
                    network === id ? "border-foreground bg-foreground text-background" : "border-transparent text-ink/70",
                  )}
                  onClick={() => setNetwork(network === id ? "" : id)}
                >
                  <SocialNetworkIcon id={id} className="size-4" />
                </button>
              ))}
            </div>
          </div>

          {calendarQuery.isError ? (
            <div className="space-y-3">
              <p className="text-sm">{t("error")}</p>
              <Button type="button" variant="outline" onClick={() => calendarQuery.refetch()}>
                {t("retry")}
              </Button>
            </div>
          ) : null}

          {calendarQuery.isLoading ? <CalendarSkeleton view={view} /> : null}

          {!calendarQuery.isLoading && !calendarQuery.isError && view === "agenda" ? (
            <Agenda
              days={weekDays}
              byDay={byDay}
              rawDay={rawDay}
              zone={zone}
              today={today}
              onOpen={setOpened}
              createHref={createHref}
            />
          ) : null}

          {!calendarQuery.isLoading && !calendarQuery.isError && view !== "agenda" ? (
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
              {view === "week" ? (
                <WeekGrid
                  days={weekDays}
                  byDay={byDay}
                  rawDay={rawDay}
                  zone={zone}
                  today={today}
                  selected={cursor}
                  onSelect={(day) => replaceQuery({ cursor: day })}
                  onOpen={setOpened}
                  createHref={createHref}
                />
              ) : (
                <MonthGrid
                  cells={cells}
                  month={cursor.slice(0, 7)}
                  byDay={byDay}
                  today={today}
                  selected={cursor}
                  onSelect={(day) => replaceQuery({ cursor: day })}
                  onOpen={setOpened}
                />
              )}
              <DayPanel
                day={cursor}
                events={byDay(cursor)}
                hidden={rawDay(cursor).length > 0 && byDay(cursor).length === 0}
                zone={zone}
                onOpen={setOpened}
                createHref={createHref(cursor)}
              />
            </div>
          ) : null}
        </div>
      </CreationFrame>
      <CalendarInspector event={opened} zone={zone} onClose={() => setOpened(null)} />
    </AppShell>
  );
}

function WeekGrid({
  days,
  byDay,
  rawDay,
  zone,
  today,
  selected,
  onSelect,
  onOpen,
  createHref,
}: {
  days: string[];
  byDay: (day: string) => CalendarEvent[];
  rawDay: (day: string) => CalendarEvent[];
  zone: string;
  today: string;
  selected: string;
  onSelect: (day: string) => void;
  onOpen: (event: CalendarEvent) => void;
  createHref: (day: string) => string;
}) {
  const t = useTranslations("calendar");
  const creation = useTranslations("creation");
  return (
    <>
      <div className="grid grid-cols-7 border border-line md:hidden">
        {days.map((day) => (
          <button
            key={day}
            type="button"
            aria-pressed={day === selected}
            className={cn(
              "min-h-14 border-l border-line text-sm first:border-l-0",
              day === today && "text-pine",
              day === selected && "bg-sand",
            )}
            onClick={() => onSelect(day)}
          >
            <span className="block text-[10px] uppercase text-ink/45">{t(`weekdayShort.${isoWeekday(day)}` as "weekdayShort.1")}</span>
            <span className="tabular-nums">{Number(day.slice(8))}</span>
          </button>
        ))}
      </div>
      <div className="hidden border border-line bg-card md:grid md:grid-cols-7">
        {days.map((day) => {
          const items = byDay(day);
          const shown = items.slice(0, 4);
          return (
            <section
              key={day}
              className={cn(
                "flex min-h-[26rem] flex-col border-l border-line first:border-l-0",
                day === today && "border-t-2 border-t-pine",
                day === selected && "bg-sand/60",
              )}
            >
              <button type="button" className="flex items-baseline justify-between px-2 py-2 text-left" onClick={() => onSelect(day)}>
                <span className="text-[11px] uppercase tracking-wide text-ink/45">{creation(`weekdays.${isoWeekday(day)}`)}</span>
                <span className={cn("text-sm tabular-nums", day === today && "font-semibold text-pine")}>{Number(day.slice(8))}</span>
              </button>
              <div className="flex flex-1 flex-col gap-1 px-1.5 pb-2">
                {shown.map((event) => (
                  <EventChip key={eventKey(event)} event={event} zone={zone} onOpen={onOpen} />
                ))}
                {items.length > shown.length ? (
                  <button type="button" className="min-h-8 px-1 text-left text-xs text-ink/60" onClick={() => onSelect(day)}>
                    {t("more", { count: items.length - shown.length })}
                  </button>
                ) : null}
                {items.length === 0 && rawDay(day).length === 0 ? (
                  <Link href={createHref(day)} className="mt-auto inline-flex min-h-11 items-center px-1 text-xs text-ink/45 hover:text-ink">
                    {t("planDay")}
                  </Link>
                ) : null}
                {items.length === 0 && rawDay(day).length > 0 ? (
                  <p className="px-1 text-xs text-ink/45">{t("emptyFiltered")}</p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function MonthGrid({
  cells,
  month,
  byDay,
  today,
  selected,
  onSelect,
  onOpen,
}: {
  cells: string[];
  month: string;
  byDay: (day: string) => CalendarEvent[];
  today: string;
  selected: string;
  onSelect: (day: string) => void;
  onOpen: (event: CalendarEvent) => void;
}) {
  const t = useTranslations("calendar");
  return (
    <div className="border border-line bg-card">
      <div className="grid grid-cols-7 border-b border-line">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
          <div key={day} className="px-1 py-2 text-center text-[11px] uppercase tracking-wide text-ink/45">
            {t(`weekdayShort.${day}` as "weekdayShort.1")}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day) => {
          const items = byDay(day);
          const outside = day.slice(0, 7) !== month;
          return (
            <div
              key={day}
                className={cn(
                "min-h-16 border-t border-line p-1 md:min-h-28 [&:nth-child(7n+1)]:border-l-0 border-l",
                outside && "bg-sand/30 text-ink/35",
                day === selected && "bg-sand/70",
              )}
            >
              <button
                type="button"
                className={cn("flex size-8 items-center justify-center text-sm tabular-nums", day === today && "font-semibold text-pine")}
                onClick={() => onSelect(day)}
              >
                {Number(day.slice(8))}
              </button>
              <div className="hidden space-y-0.5 md:block">
                {items.slice(0, 3).map((event) => (
                  <EventChip key={eventKey(event)} event={event} compact onOpen={onOpen} />
                ))}
                {items.length > 3 ? (
                  <button type="button" className="px-1 text-xs text-ink/55" onClick={() => onSelect(day)}>
                    {t("more", { count: items.length - 3 })}
                  </button>
                ) : null}
              </div>
              {items.length > 0 ? (
                <div className="flex gap-0.5 px-1 md:hidden" aria-hidden>
                  {items.slice(0, 4).map((event) => (
                    <span key={eventKey(event)} className="size-1.5" style={{ background: toneColor(toneOf(event)) }} />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Agenda({
  days,
  byDay,
  rawDay,
  zone,
  today,
  onOpen,
  createHref,
}: {
  days: string[];
  byDay: (day: string) => CalendarEvent[];
  rawDay: (day: string) => CalendarEvent[];
  zone: string;
  today: string;
  onOpen: (event: CalendarEvent) => void;
  createHref: (day: string) => string;
}) {
  const t = useTranslations("calendar");
  const creation = useTranslations("creation");
  const format = useFormatter();
  return (
    <div className="divide-y divide-line border border-line bg-card">
      {days.map((day) => {
        const items = byDay(day);
        return (
          <section key={day} className="grid gap-2 px-3 py-3 md:grid-cols-[9rem_minmax(0,1fr)]">
            <h2 className={cn("text-sm", day === today && "font-semibold text-pine")}>
              <span className="block text-[11px] uppercase tracking-wide text-ink/45">{creation(`weekdays.${isoWeekday(day)}`)}</span>
              {format.dateTime(utcNoon(day), { day: "numeric", month: "short", timeZone: "UTC" })}
            </h2>
            {items.length === 0 ? (
              rawDay(day).length === 0 ? (
                <Link href={createHref(day)} className="inline-flex min-h-11 items-center text-sm text-ink/45 hover:text-ink">
                  {t("planDay")}
                </Link>
              ) : (
                <p className="inline-flex min-h-11 items-center text-sm text-ink/45">{t("emptyFiltered")}</p>
              )
            ) : (
              <ul className="divide-y divide-line">
                {items.map((event) => (
                  <li key={eventKey(event)}>
                    <EventRow event={event} zone={zone} onOpen={onOpen} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function DayPanel({
  day,
  events,
  hidden,
  zone,
  onOpen,
  createHref,
}: {
  day: string;
  events: CalendarEvent[];
  hidden: boolean;
  zone: string;
  onOpen: (event: CalendarEvent) => void;
  createHref: string;
}) {
  const t = useTranslations("calendar");
  const creation = useTranslations("creation");
  const format = useFormatter();
  return (
    <aside className="border border-line bg-card">
      <div className="flex items-baseline justify-between gap-2 border-b border-line px-3 py-2">
        <h2 className="text-sm font-medium">
          {creation(`weekdays.${isoWeekday(day)}`)}{" "}
          {format.dateTime(utcNoon(day), { day: "numeric", month: "short", timeZone: "UTC" })}
        </h2>
        <Link href={createHref} className="inline-flex min-h-11 items-center text-xs text-ink/60 hover:text-ink">
          {t("planDay")}
        </Link>
      </div>
      {events.length === 0 ? (
        <p className="px-3 py-4 text-sm text-ink/55">{hidden ? t("emptyFiltered") : t("empty")}</p>
      ) : null}
      <ul>
        {events.map((event) => (
          <li key={eventKey(event)} className="border-b border-line last:border-b-0">
            <EventRow event={event} zone={zone} onOpen={onOpen} />
          </li>
        ))}
      </ul>
    </aside>
  );
}

function EventChip({
  event,
  zone,
  compact,
  onOpen,
}: {
  event: CalendarEvent;
  zone?: string;
  compact?: boolean;
  onOpen: (event: CalendarEvent) => void;
}) {
  const format = useFormatter();
  const networks = event.networks.filter((id): id is SocialNetworkID => NETWORKS.includes(id as SocialNetworkID));
  const tone = toneOf(event);
  const time =
    zone && !compact
      ? format.dateTime(new Date(event.at), { timeStyle: "short", timeZone: zone })
      : "";
  return (
    <button
      type="button"
      className="flex min-h-8 w-full flex-col border-l-2 bg-background px-1.5 py-1 text-left hover:bg-sand/80"
      style={{ borderLeftColor: toneColor(tone), borderLeftStyle: tone === "series" ? "dashed" : "solid" }}
      onClick={() => onOpen(event)}
    >
      <span className="flex items-center gap-1 text-[11px] tabular-nums text-ink/65">
        {time}
        {networks.slice(0, 3).map((id) => (
          <SocialNetworkIcon key={id} id={id} className="size-3" />
        ))}
      </span>
      <span className="truncate text-xs">{event.title || event.brand_name}</span>
    </button>
  );
}

function EventRow({
  event,
  zone,
  onOpen,
}: {
  event: CalendarEvent;
  zone: string;
  onOpen: (event: CalendarEvent) => void;
}) {
  const t = useTranslations("calendar");
  const creation = useTranslations("creation");
  const format = useFormatter();
  const networks = event.networks.filter((id): id is SocialNetworkID => NETWORKS.includes(id as SocialNetworkID));
  const tone = toneOf(event);
  const status =
    event.kind === "projection"
      ? t("projection")
      : creation.has(`postStatuses.${event.status}`)
        ? creation(`postStatuses.${event.status}`)
        : event.status;
  return (
    <button type="button" className="flex w-full min-h-11 items-start gap-3 px-3 py-2 text-left hover:bg-sand/70" onClick={() => onOpen(event)}>
      <span className="mt-1 size-2 shrink-0" style={{ background: toneColor(tone) }} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm">
          <span className="tabular-nums text-ink/60">
            {format.dateTime(new Date(event.at), { timeStyle: "short", timeZone: zone })}
          </span>
          <span className="truncate font-medium">{event.title || event.brand_name}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-2 text-xs text-ink/55">
          <span>{status}</span>
          {event.approval_status === "pending" ? <span>{creation("approvalPending")}</span> : null}
          <span className="inline-flex gap-1">
            {networks.map((id) => (
              <SocialNetworkIcon key={id} id={id} className="size-3" />
            ))}
          </span>
        </span>
      </span>
    </button>
  );
}

function CalendarSkeleton({ view }: { view: View }) {
  const cells = view === "month" ? 35 : 7;
  return (
    <div className={cn("grid border border-line", view === "agenda" ? "grid-cols-1" : "grid-cols-7")}>
      {Array.from({ length: cells }, (_, index) => (
        <div key={index} className="h-24 animate-pulse border-l border-t border-line bg-sand/40 first:border-l-0" />
      ))}
    </div>
  );
}
