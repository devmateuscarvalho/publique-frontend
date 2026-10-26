"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Receipt,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import type { DateRange } from "react-day-picker";
import { enUS, ptBR } from "react-day-picker/locale";
import { Bar, BarChart, CartesianGrid, Cell, Label, Pie, PieChart, XAxis, YAxis } from "recharts";

import { AppShell } from "@/components/app-shell";
import { useAccount } from "@/components/use-account";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  api,
  type AICostGroup,
  type AICostReport,
  type AIMissingPrice,
  type AIModelPrice,
  type AIPostCost,
  type AIReconciliation,
  type AIUsageCall,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const PRESETS = ["today", "7d", "30d", "month", "last_month", "90d"] as const;
type Preset = (typeof PRESETS)[number];
const SPLITS = ["stage", "model", "origin"] as const;
type Split = (typeof SPLITS)[number];
const RANKINGS = ["organization", "brand", "model", "post"] as const;
type Ranking = (typeof RANKINGS)[number];
const ORIGINS = ["customer", "automation", "lab", "system"] as const;
const SERIES_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const OTHER_COLOR = "var(--chart-6)";
const MAX_SERIES = 5;

function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const pad = (n: number) => String(n).padStart(2, "0");
const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);

function fromYmd(raw: string | null): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw ?? "");
  if (!m) {
    return null;
  }
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Inclusive local days for a preset, in the browser zone. */
function presetRange(preset: Preset, today = startOfToday()): { from: Date; to: Date } {
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: addDays(today, -6), to: today };
    case "30d":
      return { from: addDays(today, -29), to: today };
    case "90d":
      return { from: addDays(today, -89), to: today };
    case "last_month":
      return {
        from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        to: new Date(today.getFullYear(), today.getMonth(), 0),
      };
    default:
      return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: today };
  }
}

type Money = (micros: number | null | undefined, currency?: string) => string;

function useMoney(): Money {
  const locale = useLocale();
  return (micros, currency = "USD") => {
    if (micros == null) {
      return "—";
    }
    const value = micros / 1_000_000;
    const digits = value !== 0 && Math.abs(value) < 1 ? 4 : 2;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.trim() || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: digits,
    }).format(value);
  };
}

function usePercent() {
  const locale = useLocale();
  return (ratio: number, signed = false) =>
    new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: ratio !== 0 && Math.abs(ratio) < 0.1 ? 1 : 0,
      signDisplay: signed ? "exceptZero" : "auto",
    }).format(ratio);
}

function useLabel(namespace: "stages" | "origins" | "units" | "statuses") {
  const t = useTranslations(`aiCosts.${namespace}`);
  return (key: string) => (key && t.has(key) ? t(key) : key || "—");
}

function SuperAdminOnly({ title, children }: { title: string; children: ReactNode }) {
  const t = useTranslations("backoffice");
  const { me, loading } = useAccount();
  if (loading || me.isLoading) {
    return null;
  }
  if (me.data?.user.platform_role !== "super_admin") {
    return (
      <AppShell title={t("title")}>
        <p className="text-sm text-ink/70">{t("forbidden")}</p>
      </AppShell>
    );
  }
  return <AppShell title={title}>{children}</AppShell>;
}

function useCostReport(params: Record<string, string | undefined>, groupBy: string, splitBy = "", enabled = true) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }
  if (groupBy) {
    search.set("group_by", groupBy);
  }
  if (splitBy) {
    search.set("split_by", splitBy);
  }
  const query = search.toString();
  return useQuery({
    queryKey: ["backoffice-ai-costs", query],
    queryFn: () => api<AICostReport>(`/v1/backoffice/ai-costs?${query}`),
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function BackofficeAICostsScreen() {
  const t = useTranslations("aiCosts");
  return (
    <SuperAdminOnly title={t("title")}>
      <Suspense>
        <CostsBody />
      </Suspense>
    </SuperAdminOnly>
  );
}

function CostsBody() {
  const t = useTranslations("aiCosts");
  const stageLabel = useLabel("stages");
  const originLabel = useLabel("origins");
  const money = useMoney();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tz = useMemo(() => browserTimeZone(), []);

  const fallback = presetRange("month");
  const from = fromYmd(searchParams.get("from")) ?? fallback.from;
  const toParam = fromYmd(searchParams.get("to")) ?? fallback.to;
  const to = toParam < from ? from : toParam;
  const orgId = searchParams.get("org") ?? "";
  const brandId = searchParams.get("brand") ?? "";
  const model = searchParams.get("model") ?? "";
  const origin = searchParams.get("origin") ?? "";
  const stage = searchParams.get("stage") ?? "";
  const split: Split = (SPLITS as readonly string[]).includes(searchParams.get("split") ?? "")
    ? (searchParams.get("split") as Split)
    : "stage";
  const rankingParam = searchParams.get("rank") ?? "";
  const ranking: Ranking = (RANKINGS as readonly string[]).includes(rankingParam)
    ? (rankingParam as Ranking)
    : orgId
      ? "brand"
      : "organization";

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

  const fromISO = from.toISOString();
  const toISO = addDays(to, 1).toISOString();
  const length = daysBetween(from, to) + 1;
  const dateParams = { tz, from: fromISO, to: toISO };
  const scope = {
    ...dateParams,
    organization_id: orgId || undefined,
    brand_id: brandId || undefined,
    model: model || undefined,
    origin: origin || undefined,
    stage: stage || undefined,
  };
  const previousScope = { ...scope, from: addDays(from, -length).toISOString(), to: fromISO };

  const daily = useCostReport(scope, "day", split);
  const previous = useCostReport(previousScope, "");
  const byStage = useCostReport(scope, "stage");
  const byOrigin = useCostReport(scope, "origin");
  const ranked = useCostReport({ ...scope, limit: ranking === "post" ? "15" : "50" }, ranking);
  const orgOptions = useCostReport(dateParams, "organization");
  const brandOptions = useCostReport({ ...dateParams, organization_id: orgId || undefined }, "brand");
  const modelOptions = useCostReport(
    { ...dateParams, organization_id: orgId || undefined, brand_id: brandId || undefined },
    "model",
  );
  const missing = useQuery({
    queryKey: ["backoffice-ai-prices-missing"],
    queryFn: () => api<{ missing: AIMissingPrice[] }>("/v1/backoffice/ai-prices/missing"),
  });

  const totals = daily.data?.totals;
  const missingModels = new Set((missing.data?.missing ?? []).map((m) => `${m.provider}/${m.model}`));
  const hasFilters = Boolean(orgId || brandId || model || origin || stage);
  const splitLabel = (key: string) => (split === "stage" ? stageLabel(key) : split === "origin" ? originLabel(key) : key);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="max-w-2xl text-sm text-ink/70">{t("lead")}</p>
        <p className="text-xs text-ink/50">{t("tzNote", { tz })}</p>
      </header>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
        <DateRangeFilter
          from={from}
          to={to}
          onChange={(range) => setParam({ from: toYmd(range.from), to: toYmd(range.to) })}
        />
        <ComboFilter
          label={t("filters.organization")}
          allLabel={t("filters.allOrganizations")}
          value={orgId}
          options={(orgOptions.data?.groups ?? [])
            .filter((g) => g.key)
            .map((g) => ({ value: g.key, label: g.label || t("noOrganization"), hint: money(g.cost_micros, g.currency) }))}
          onChange={(value) => setParam({ org: value, brand: "", rank: "" })}
        />
        <ComboFilter
          label={t("filters.brand")}
          allLabel={t("filters.allBrands")}
          value={brandId}
          options={(brandOptions.data?.groups ?? [])
            .filter((g) => g.key)
            .map((g) => ({ value: g.key, label: g.label || t("noBrand"), hint: money(g.cost_micros, g.currency) }))}
          onChange={(value) => setParam({ brand: value })}
        />
        <ComboFilter
          label={t("filters.model")}
          allLabel={t("filters.allModels")}
          value={model}
          options={(modelOptions.data?.groups ?? []).map((g) => ({
            value: g.key,
            label: g.label,
            hint: money(g.cost_micros, g.currency),
          }))}
          onChange={(value) => setParam({ model: value })}
        />
        <ComboFilter
          label={t("filters.origin")}
          allLabel={t("filters.allOrigins")}
          value={origin}
          searchable={false}
          options={ORIGINS.map((o) => ({ value: o, label: originLabel(o) }))}
          onChange={(value) => setParam({ origin: value })}
        />
        <ComboFilter
          label={t("filters.stage")}
          allLabel={t("filters.allStages")}
          value={stage}
          options={(daily.data?.stages ?? []).map((s) => ({ value: s, label: stageLabel(s) }))}
          onChange={(value) => setParam({ stage: value })}
        />
        {hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 shrink-0 rounded-full"
            onClick={() => setParam({ org: "", brand: "", model: "", origin: "", stage: "", rank: "" })}
          >
            <X className="size-4" />
            {t("filters.clear")}
          </Button>
        ) : null}
      </div>

      {missing.data && missing.data.missing.length > 0 ? (
        <Link
          href="/backoffice/costs/prices"
          className="flex min-h-11 items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
        >
          <AlertTriangle className="size-5 shrink-0 text-amber-600" />
          <span className="min-w-0 flex-1">{t("missingBanner", { count: missingModels.size })}</span>
          <ChevronRight className="size-4 shrink-0" />
        </Link>
      ) : null}

      <KpiRow totals={totals} previous={previous.data?.totals} money={money} />

      <Card
        title={t("charts.spendOverTime")}
        action={
          <Segmented
            value={split}
            options={SPLITS.map((s) => ({ value: s, label: t(`charts.split_${s}`) }))}
            onChange={(value) => setParam({ split: value === "stage" ? "" : value })}
          />
        }
      >
        <DailyChart report={daily.data} loading={daily.isLoading} from={from} to={to} labelOf={splitLabel} />
      </Card>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card title={t("charts.byOrigin")} className="lg:col-span-2">
          <OriginDonut report={byOrigin.data} loading={byOrigin.isLoading} money={money} />
        </Card>
        <Card title={t("charts.byStage")} className="lg:col-span-3">
          <ShareList
            report={byStage.data}
            loading={byStage.isLoading}
            money={money}
            labelOf={(g) => stageLabel(g.key)}
            activeKey={stage}
            onPick={(g) => setParam({ stage: g.key === stage ? "" : g.key })}
          />
        </Card>
      </div>

      <Card
        title={t("charts.ranking")}
        action={
          <Segmented
            value={ranking}
            options={RANKINGS.filter((r) => r !== "organization" || !orgId).map((r) => ({
              value: r,
              label: t(`charts.tab_${r}`),
            }))}
            onChange={(value) => setParam({ rank: value })}
          />
        }
      >
        <ShareList
          report={ranked.data}
          loading={ranked.isLoading}
          money={money}
          labelOf={(g) =>
            ranking === "organization"
              ? g.label || t("noOrganization")
              : ranking === "brand"
                ? g.label || t("noBrand")
                : ranking === "post"
                  ? g.key
                    ? g.label || t("untitledPost")
                    : t("noPost")
                  : g.label
          }
          activeKey={ranking === "organization" ? orgId : ranking === "brand" ? brandId : ranking === "model" ? model : ""}
          hrefOf={ranking === "post" ? (g) => (g.key ? `/backoffice/costs/posts/${g.key}` : undefined) : undefined}
          onPick={
            ranking === "post"
              ? undefined
              : (g) => {
                  if (!g.key) return;
                  if (ranking === "organization") setParam({ org: g.key, brand: "", rank: "" });
                  if (ranking === "brand") setParam({ brand: g.key === brandId ? "" : g.key });
                  if (ranking === "model") setParam({ model: g.key === model ? "" : g.key });
                }
          }
        />
      </Card>

      <ReconciliationCard from={from} to={to} scoped={Boolean(orgId || brandId || stage || origin)} />

      <Link
        href="/backoffice/costs/prices"
        className="flex min-h-11 items-center gap-3 rounded-xl border border-input bg-card p-4 text-sm font-medium"
      >
        <Receipt className="size-4 text-ink/60" />
        <span className="flex-1">{t("prices")}</span>
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}

function Card({
  title,
  action,
  className,
  children,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("min-w-0 space-y-4 rounded-xl border border-input bg-card p-4 md:p-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-11 shrink-0 rounded-full px-4 text-sm transition-colors",
            o.value === value ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-muted/70",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function FilterTrigger({
  active,
  children,
  className,
  ...props
}: { active: boolean; children: ReactNode } & ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition-colors",
        active ? "border-foreground bg-foreground text-background" : "border-input bg-card text-foreground hover:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}

function DateRangeFilter({ from, to, onChange }: { from: Date; to: Date; onChange: (range: { from: Date; to: Date }) => void }) {
  const t = useTranslations("aiCosts");
  const locale = useLocale();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();
  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });
  const preset = PRESETS.find((p) => {
    const r = presetRange(p);
    return toYmd(r.from) === toYmd(from) && toYmd(r.to) === toYmd(to);
  });
  const label = preset ? t(`presets.${preset}`) : fmt.formatRange(from, to);
  const selected = draft ?? { from, to };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setDraft(undefined);
      }}
    >
      <PopoverTrigger asChild>
        <FilterTrigger active aria-label={t("filters.period")}>
          <CalendarDays className="size-4" />
          <span className="max-w-56 truncate">{label}</span>
          <ChevronDown className="size-4 opacity-70" />
        </FilterTrigger>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] p-0">
        <div className="flex flex-col md:flex-row">
          <div className="grid grid-cols-2 gap-1 border-b border-input p-2 md:flex md:w-44 md:flex-col md:border-r md:border-b-0">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  onChange(presetRange(p));
                  setOpen(false);
                }}
                className={cn(
                  "min-h-11 rounded-md px-3 text-left text-sm",
                  p === preset ? "bg-foreground text-background" : "hover:bg-muted",
                )}
              >
                {t(`presets.${p}`)}
              </button>
            ))}
          </div>
          <div className="p-1">
            <Calendar
              mode="range"
              locale={locale.startsWith("pt") ? ptBR : enUS}
              numberOfMonths={isMobile ? 1 : 2}
              defaultMonth={isMobile ? to : new Date(to.getFullYear(), to.getMonth() - 1, 1)}
              selected={selected}
              disabled={{ after: startOfToday() }}
              onSelect={(_, day) => {
                if (!draft) {
                  setDraft({ from: day, to: undefined });
                  return;
                }
                const start = draft.from ?? day;
                const [a, b] = day < start ? [day, start] : [start, day];
                onChange({ from: a, to: b });
                setOpen(false);
              }}
            />
            {draft ? <p className="px-3 pb-3 text-xs text-ink/60">{t("filters.pickEnd")}</p> : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type ComboOption = { value: string; label: string; hint?: string };

function ComboFilter({
  label,
  allLabel,
  value,
  options,
  onChange,
  searchable = true,
}: {
  label: string;
  allLabel: string;
  value: string;
  options: ComboOption[];
  onChange: (value: string) => void;
  searchable?: boolean;
}) {
  const t = useTranslations("aiCosts");
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
  };
  return (
    <span className="inline-flex shrink-0 items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <FilterTrigger active={Boolean(value)} className={value ? "rounded-r-none pr-3" : undefined}>
            <span className={value ? "opacity-70" : undefined}>{label}</span>
            {value ? <span className="max-w-40 truncate font-medium">{current?.label ?? value}</span> : null}
            {!value ? <ChevronDown className="size-4 opacity-70" /> : null}
          </FilterTrigger>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 max-w-[calc(100vw-2rem)] p-0">
          <Command>
            {searchable ? <CommandInput placeholder={t("filters.search")} className="h-11" /> : null}
            <CommandList>
              <CommandEmpty>{t("filters.noResults")}</CommandEmpty>
              <CommandGroup>
                <CommandItem value={`__all ${allLabel}`} onSelect={() => pick("")} className="min-h-11">
                  <Check className={cn("size-4", value ? "opacity-0" : "opacity-100")} />
                  {allLabel}
                </CommandItem>
                {options.map((o) => (
                  <CommandItem key={o.value} value={`${o.label} ${o.value}`} onSelect={() => pick(o.value)} className="min-h-11">
                    <Check className={cn("size-4", o.value === value ? "opacity-100" : "opacity-0")} />
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    {o.hint ? <span className="shrink-0 text-xs tabular-nums text-ink/60">{o.hint}</span> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t("clearFilter", { name: current?.label ?? label })}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-r-full border border-l border-foreground border-l-background/20 bg-foreground text-background"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </span>
  );
}

type Totals = AICostReport["totals"];

function KpiRow({ totals, previous, money }: { totals?: Totals; previous?: Totals; money: Money }) {
  const t = useTranslations("aiCosts");
  const locale = useLocale();
  const percent = usePercent();
  if (!totals) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  const delta = previous && previous.cost_micros > 0 ? (totals.cost_micros - previous.cost_micros) / previous.cost_micros : null;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi
        className="col-span-2 lg:col-span-1"
        label={t("kpi.total")}
        value={money(totals.cost_micros, totals.currency)}
        strong
        foot={
          delta === null ? (
            <span>{previous ? t("kpi.noPrevious") : "\u00a0"}</span>
          ) : (
            <span className="inline-flex flex-wrap items-center gap-1">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
                  delta > 0 ? "bg-destructive/15 text-destructive" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                )}
              >
                {delta > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {percent(delta, true)}
              </span>
              {t("kpi.vsPrevious", { amount: money(previous!.cost_micros, previous!.currency) })}
            </span>
          )
        }
      />
      <Kpi
        label={t("kpi.perPublished")}
        value={totals.published_posts > 0 ? money(Math.round(totals.cost_micros / totals.published_posts), totals.currency) : "—"}
        foot={t("kpi.published", { published: totals.published_posts, posts: totals.posts })}
      />
      <Kpi
        label={t("kpi.calls")}
        value={totals.calls.toLocaleString(locale)}
        foot={
          totals.failed_calls > 0 ? (
            <span className="text-destructive">{t("kpi.failedShare", { rate: percent(totals.failed_calls / totals.calls) })}</span>
          ) : (
            t("kpi.noFailures")
          )
        }
      />
      <Kpi
        className="col-span-2 lg:col-span-1"
        label={t("kpi.perCall")}
        value={totals.calls > 0 ? money(Math.round(totals.cost_micros / totals.calls), totals.currency) : "—"}
        foot={totals.unpriced_calls > 0 ? `${t("kpi.unpriced")}: ${totals.unpriced_calls}` : "\u00a0"}
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  foot,
  strong,
  className,
}: {
  label: string;
  value: string;
  foot?: ReactNode;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-xl border border-input bg-card p-4", className)}>
      <p className="text-xs text-ink/60">{label}</p>
      <p className={cn("mt-1 truncate tabular-nums", strong ? "text-3xl font-semibold" : "text-xl font-semibold")}>{value}</p>
      {foot ? <div className="mt-2 text-xs text-ink/60">{foot}</div> : null}
    </div>
  );
}

function useAxisMoney() {
  const locale = useLocale();
  return (dollars: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      currencyDisplay: "narrowSymbol",
      notation: dollars >= 1000 ? "compact" : "standard",
      maximumFractionDigits: dollars > 0 && dollars < 1 ? 2 : 0,
    }).format(dollars);
}

function TooltipRow({ color, label, value }: { color?: string; label: ReactNode; value: string }) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
        <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: color }} />
        <span className="truncate">{label}</span>
      </span>
      <span className="font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function DailyChart({
  report,
  loading,
  from,
  to,
  labelOf,
}: {
  report?: AICostReport;
  loading: boolean;
  from: Date;
  to: Date;
  labelOf: (key: string) => string;
}) {
  const t = useTranslations("aiCosts");
  const locale = useLocale();
  const money = useMoney();
  const axisMoney = useAxisMoney();
  const { rows, series, config } = useMemo(() => {
    const groups = report?.groups ?? [];
    const sums = new Map<string, number>();
    for (const g of groups) {
      for (const s of g.splits ?? []) {
        sums.set(s.key, (sums.get(s.key) ?? 0) + s.cost_micros);
      }
    }
    const ranked = [...sums.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const top = ranked.slice(0, MAX_SERIES).map(([key], i) => ({ id: `s${i}`, key, color: SERIES_COLORS[i] }));
    const hasOther = ranked.length > MAX_SERIES;
    const idOf = new Map(top.map((s) => [s.key, s.id]));
    const byDay = new Map(groups.map((g) => [g.key, g]));
    const out: Record<string, number | string>[] = [];
    for (let d = from; d <= to; d = addDays(d, 1)) {
      const ymd = toYmd(d);
      const row: Record<string, number | string> = { day: ymd };
      for (const s of top) row[s.id] = 0;
      if (hasOther) row.other = 0;
      for (const s of byDay.get(ymd)?.splits ?? []) {
        const id = idOf.get(s.key) ?? (hasOther ? "other" : undefined);
        if (id) row[id] = (row[id] as number) + s.cost_micros / 1_000_000;
      }
      out.push(row);
    }
    const cfg: ChartConfig = {};
    for (const s of top) cfg[s.id] = { label: labelOf(s.key), color: s.color };
    if (hasOther) cfg.other = { label: t("charts.other"), color: OTHER_COLOR };
    return {
      rows: out,
      series: [...top.map((s) => s.id), ...(hasOther ? ["other"] : [])],
      config: cfg,
    };
  }, [report, from, to, labelOf, t]);

  if (loading && !report) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (series.length === 0) {
    return <p className="py-16 text-center text-sm text-ink/60">{t("empty")}</p>;
  }
  const dayShort = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const dayLong = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "long" });
  const asDate = (ymd: string) => fromYmd(ymd) ?? new Date();
  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full md:h-72">
      <BarChart data={rows} margin={{ left: 0, right: 4, top: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(v: string) => dayShort.format(asDate(v))}
        />
        <YAxis tickLine={false} axisLine={false} width={60} tickFormatter={(v: number) => axisMoney(v)} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const day = payload?.[0]?.payload?.day as string | undefined;
                const total = series.reduce((sum, id) => sum + Number(payload?.[0]?.payload?.[id] ?? 0), 0);
                return (
                  <div className="flex items-center justify-between gap-4">
                    <span>{day ? dayLong.format(asDate(day)) : ""}</span>
                    <span className="tabular-nums">{money(Math.round(total * 1_000_000))}</span>
                  </div>
                );
              }}
              formatter={(value, name, item) =>
                Number(value) > 0 ? (
                  <TooltipRow
                    color={item.color}
                    label={config[String(name)]?.label ?? name}
                    value={money(Math.round(Number(value) * 1_000_000))}
                  />
                ) : null
              }
            />
          }
        />
        {series.map((id, i) => (
          <Bar
            key={id}
            dataKey={id}
            stackId="cost"
            fill={`var(--color-${id})`}
            radius={i === series.length - 1 ? [3, 3, 0, 0] : 0}
            maxBarSize={36}
          />
        ))}
        <ChartLegend content={<ChartLegendContent className="flex-wrap gap-x-4 gap-y-1" />} />
      </BarChart>
    </ChartContainer>
  );
}

function OriginDonut({ report, loading, money }: { report?: AICostReport; loading: boolean; money: Money }) {
  const t = useTranslations("aiCosts");
  const originLabel = useLabel("origins");
  const percent = usePercent();
  const groups = (report?.groups ?? []).filter((g) => g.cost_micros > 0);
  const total = groups.reduce((sum, g) => sum + g.cost_micros, 0);
  const colorOf = (key: string) => {
    const i = (ORIGINS as readonly string[]).indexOf(key);
    return i >= 0 ? SERIES_COLORS[i] : OTHER_COLOR;
  };
  const config: ChartConfig = Object.fromEntries(groups.map((g) => [g.key, { label: originLabel(g.key), color: colorOf(g.key) }]));
  const data = groups.map((g) => ({ key: g.key, value: g.cost_micros / 1_000_000, fill: `var(--color-${g.key})` }));

  if (loading && !report) {
    return <Skeleton className="mx-auto size-48 rounded-full" />;
  }
  if (groups.length === 0) {
    return <p className="py-12 text-center text-sm text-ink/60">{t("empty")}</p>;
  }
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col">
      <ChartContainer config={config} className="aspect-square h-48 shrink-0">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, name, item) => (
                  <TooltipRow
                    color={item.payload?.fill}
                    label={config[String(name)]?.label ?? name}
                    value={money(Math.round(Number(value) * 1_000_000))}
                  />
                )}
              />
            }
          />
          <Pie data={data} dataKey="value" nameKey="key" innerRadius={56} outerRadius={84} strokeWidth={2} paddingAngle={2}>
            {data.map((d) => (
              <Cell key={d.key} fill={d.fill} />
            ))}
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox)) return null;
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) - 8} className="fill-muted-foreground text-[11px]">
                      {t("charts.total")}
                    </tspan>
                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 12} className="fill-foreground text-sm font-semibold">
                      {money(total)}
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="w-full min-w-0 flex-1 space-y-2 text-sm">
        {groups.map((g) => (
          <li key={g.key} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-3 shrink-0 rounded-sm" style={{ background: colorOf(g.key) }} />
              <span className="truncate">{originLabel(g.key)}</span>
            </span>
            <span className="shrink-0 text-right tabular-nums">
              {money(g.cost_micros, g.currency)}
              <span className="ml-2 text-xs text-ink/60">{percent(g.cost_micros / total)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ShareList({
  report,
  loading,
  money,
  labelOf,
  onPick,
  hrefOf,
  activeKey,
}: {
  report?: AICostReport;
  loading: boolean;
  money: Money;
  labelOf: (g: AICostGroup) => string;
  onPick?: (g: AICostGroup) => void;
  hrefOf?: (g: AICostGroup) => string | undefined;
  activeKey?: string;
}) {
  const t = useTranslations("aiCosts");
  const percent = usePercent();
  if (loading && !report) {
    return <Skeleton className="h-40 w-full" />;
  }
  const groups = report?.groups ?? [];
  if (groups.length === 0) {
    return <p className="py-12 text-center text-sm text-ink/60">{t("empty")}</p>;
  }
  const total = Math.max(1, report?.totals.cost_micros ?? 0);
  const max = Math.max(1, ...groups.map((g) => g.cost_micros));
  return (
    <ul className="-mx-2 space-y-1">
      {groups.map((g, i) => {
        const href = hrefOf?.(g);
        const active = Boolean(activeKey) && g.key === activeKey;
        const body = (
          <>
            <span className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="w-5 shrink-0 text-right text-xs tabular-nums text-ink/40">{i + 1}</span>
                <span className="truncate text-sm font-medium">{labelOf(g)}</span>
              </span>
              <span className="shrink-0 text-sm font-medium tabular-nums">{money(g.cost_micros, g.currency)}</span>
            </span>
            <span className="mt-1.5 ml-7 block h-2 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full"
                style={{ width: `${(g.cost_micros / max) * 100}%`, background: active ? "var(--chart-1)" : "var(--chart-4)" }}
              />
            </span>
            <span className="mt-1 ml-7 flex flex-wrap gap-x-2 text-xs text-ink/60">
              <span>{t("charts.share", { share: percent(g.cost_micros / total) })}</span>
              <span>· {t("callsCount", { count: g.calls })}</span>
              {g.failed_calls > 0 ? <span className="text-destructive">· {t("failedCount", { count: g.failed_calls })}</span> : null}
              {g.unpriced_calls > 0 ? <span className="text-amber-600">· {t("unpricedCount", { count: g.unpriced_calls })}</span> : null}
            </span>
          </>
        );
        const rowClass = cn(
          "block min-h-11 w-full rounded-lg px-2 py-2.5 text-left transition-colors",
          active ? "bg-muted" : href || onPick ? "hover:bg-muted/60" : "",
        );
        return (
          <li key={g.key || "none"}>
            {href ? (
              <Link href={href} className={rowClass}>
                {body}
              </Link>
            ) : onPick && g.key ? (
              <button type="button" className={rowClass} onClick={() => onPick(g)} aria-pressed={active}>
                {body}
              </button>
            ) : (
              <div className={rowClass}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ReconciliationCard({ from, to, scoped }: { from: Date; to: Date; scoped: boolean }) {
  const t = useTranslations("aiCosts");
  const money = useMoney();
  const percent = usePercent();
  const locale = useLocale();
  const axisMoney = useAxisMoney();
  const utcFrom = `${toYmd(from)}T00:00:00Z`;
  const utcTo = `${toYmd(addDays(to, 1))}T00:00:00Z`;
  const query = useQuery({
    queryKey: ["backoffice-ai-reconciliation", utcFrom, utcTo],
    queryFn: () =>
      api<AIReconciliation>(
        `/v1/backoffice/ai-costs/reconciliation?from=${encodeURIComponent(utcFrom)}&to=${encodeURIComponent(utcTo)}`,
      ),
    enabled: !scoped,
  });
  const config: ChartConfig = {
    estimated: { label: t("estimated"), color: "var(--chart-4)" },
    billed: { label: t("billed"), color: "var(--chart-1)" },
  };

  if (scoped) {
    return (
      <Card title={t("reconciliation")}>
        <p className="text-sm text-ink/60">{t("reconciliationScoped")}</p>
      </Card>
    );
  }
  const data = query.data;
  if (!data) {
    return (
      <Card title={t("reconciliation")}>
        {query.isError ? <p className="text-sm text-destructive">{t("loadError")}</p> : <Skeleton className="h-40 w-full" />}
      </Card>
    );
  }
  const billedDays = data.days.filter((d) => d.billed);
  const estimated = billedDays.reduce((sum, d) => sum + d.estimated_micros, 0);
  const billed = billedDays.reduce((sum, d) => sum + d.billed_micros, 0);
  const diff = billed > 0 ? (estimated - billed) / billed : null;
  const when = data.last_synced_at
    ? new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(new Date(data.last_synced_at))
    : null;
  const dayShort = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const rows = billedDays.map((d) => ({
    day: d.key,
    estimated: d.estimated_micros / 1_000_000,
    billed: d.billed_micros / 1_000_000,
  }));

  return (
    <Card title={t("reconciliation")}>
      {!data.sync_configured && billedDays.length === 0 ? (
        <p className="text-sm text-ink/60">{t("syncOff")}</p>
      ) : billedDays.length === 0 ? (
        <p className="text-sm text-ink/60">
          {t("notBilledYet")}
          {when ? ` ${t("lastSync", { when })}` : ""}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="min-w-0">
              <p className="text-xs text-ink/60">{t("estimated")}</p>
              <p className="truncate text-lg font-semibold tabular-nums">{money(estimated, data.currency)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-ink/60">{t("billed")}</p>
              <p className="truncate text-lg font-semibold tabular-nums">{money(billed, data.currency)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-ink/60">{t("difference")}</p>
              <p
                className={cn(
                  "truncate text-lg font-semibold tabular-nums",
                  diff !== null && Math.abs(diff) > 0.1 ? "text-destructive" : "",
                )}
              >
                {diff === null ? "—" : percent(diff, true)}
              </p>
            </div>
          </div>
          <ChartContainer config={config} className="aspect-auto h-52 w-full">
            <BarChart data={rows} margin={{ left: 0, right: 4, top: 4 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={(v: string) => dayShort.format(new Date(`${v}T00:00:00Z`))}
              />
              <YAxis tickLine={false} axisLine={false} width={60} tickFormatter={(v: number) => axisMoney(v)} />
              <ChartTooltip
                cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      const day = payload?.[0]?.payload?.day as string | undefined;
                      return day ? dayShort.format(new Date(`${day}T00:00:00Z`)) : "";
                    }}
                    formatter={(value, name, item) => (
                      <TooltipRow
                        color={item.color}
                        label={config[String(name)]?.label ?? name}
                        value={money(Math.round(Number(value) * 1_000_000), data.currency)}
                      />
                    )}
                  />
                }
              />
              <Bar dataKey="estimated" fill="var(--color-estimated)" radius={[3, 3, 0, 0]} maxBarSize={24} />
              <Bar dataKey="billed" fill="var(--color-billed)" radius={[3, 3, 0, 0]} maxBarSize={24} />
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ChartContainer>
          {data.models.length > 0 ? (
            <ul className="divide-y divide-input text-sm">
              {data.models.slice(0, 8).map((m) => (
                <li key={m.key} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">{m.key}</span>
                  <span className="shrink-0 text-xs tabular-nums text-ink/70">
                    {money(m.estimated_micros, data.currency)} / {m.billed ? money(m.billed_micros, data.currency) : "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-xs text-ink/60">
            {t("reconciliationNote", { days: billedDays.length })}
            {when ? ` ${t("lastSync", { when })}` : ""}
          </p>
        </>
      )}
    </Card>
  );
}

export function BackofficeAIPostCostScreen({ postId }: { postId: string }) {
  const t = useTranslations("aiCosts");
  return (
    <SuperAdminOnly title={t("postTitle")}>
      <PostCostBody postId={postId} />
    </SuperAdminOnly>
  );
}

function PostCostBody({ postId }: { postId: string }) {
  const t = useTranslations("aiCosts");
  const tStatus = useTranslations("creation");
  const stageLabel = useLabel("stages");
  const money = useMoney();
  const percent = usePercent();
  const query = useQuery({
    queryKey: ["backoffice-ai-post-cost", postId],
    queryFn: () => api<AIPostCost>(`/v1/backoffice/ai-costs/posts/${postId}`),
  });
  if (query.isLoading) {
    return <Skeleton className="mx-auto h-48 w-full max-w-2xl" />;
  }
  if (query.isError || !query.data) {
    return <p className="text-sm text-destructive">{t("loadError")}</p>;
  }
  const post = query.data;
  const byStage = new Map<string, number>();
  for (const call of post.calls) {
    byStage.set(call.stage, (byStage.get(call.stage) ?? 0) + (call.cost_micros ?? 0));
  }
  const stages = [...byStage.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const stageTotal = Math.max(1, stages.reduce((sum, [, v]) => sum + v, 0));
  const failed = post.calls.filter((c) => c.status === "failed").length;
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <Link href="/backoffice/costs" className="inline-flex min-h-11 items-center text-sm text-ink/70">
        ← {t("title")}
      </Link>
      <div className="rounded-xl border border-input bg-card p-4 md:p-5">
        <p className="text-xs text-ink/60">
          {[post.organization_name, post.brand_name].filter(Boolean).join(" · ") || t("deletedPost")}
        </p>
        <p className="mt-1 text-base font-medium">{post.title || t("untitledPost")}</p>
        <p className="mt-2 text-3xl font-semibold tabular-nums">{money(post.cost_micros, post.currency)}</p>
        <p className="mt-1 text-xs text-ink/60">
          {t("callsCount", { count: post.calls.length })}
          {failed > 0 ? <span className="text-destructive"> · {t("failedCount", { count: failed })}</span> : null}
          {post.status
            ? ` · ${tStatus.has(`postStatuses.${post.status}`) ? tStatus(`postStatuses.${post.status}`) : post.status}`
            : ""}
        </p>
        {stages.length > 0 ? (
          <div className="mt-4 space-y-2">
            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
              {stages.map(([stage, cost], i) => (
                <span
                  key={stage}
                  className="h-full"
                  style={{ width: `${(cost / stageTotal) * 100}%`, background: SERIES_COLORS[i] ?? OTHER_COLOR }}
                />
              ))}
            </div>
            <ul className="grid gap-1 text-xs sm:grid-cols-2">
              {stages.map(([stage, cost], i) => (
                <li key={stage} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: SERIES_COLORS[i] ?? OTHER_COLOR }} />
                    <span className="truncate">{stageLabel(stage)}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-ink/70">
                    {money(cost, post.currency)} · {percent(cost / stageTotal)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <h2 className="pt-2 text-sm font-semibold">{t("postCalls")}</h2>
      <ol className="relative space-y-3 border-l border-input pl-4">
        {post.calls.map((call) => (
          <CallCard key={call.id} call={call} money={money} />
        ))}
      </ol>
    </div>
  );
}

function CallCard({ call, money }: { call: AIUsageCall; money: Money }) {
  const t = useTranslations("aiCosts");
  const stageLabel = useLabel("stages");
  const originLabel = useLabel("origins");
  const unitLabel = useLabel("units");
  const locale = useLocale();
  const when = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "medium" }).format(new Date(call.created_at));
  const failed = call.status === "failed";
  return (
    <li className={cn("relative rounded-xl border bg-card p-4", failed ? "border-destructive/40" : "border-input")}>
      <span
        className={cn(
          "absolute top-5 -left-[1.4rem] size-2.5 rounded-full ring-4 ring-background",
          failed ? "bg-destructive" : "bg-foreground/60",
        )}
      />
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium">{stageLabel(call.stage)}</p>
        <p className="shrink-0 text-sm tabular-nums">{call.usage_missing ? t("noUsage") : money(call.cost_micros, call.currency)}</p>
      </div>
      <p className="mt-1 text-xs text-ink/60">
        {when} · {call.provider}/{call.model} · {originLabel(call.origin)} ·{" "}
        {new Intl.NumberFormat(locale, { style: "unit", unit: "second", maximumFractionDigits: 1 }).format(call.duration_ms / 1000)}
      </p>
      {failed ? <p className="mt-1 text-xs text-destructive">{t("failedWith", { code: call.error_code || "—" })}</p> : null}
      {call.lines.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs">
          {call.lines.map((line) => (
            <li key={line.unit} className="flex justify-between gap-3">
              <span className="text-ink/70">
                {unitLabel(line.unit)} · {line.quantity.toLocaleString(locale)}
              </span>
              <span className="tabular-nums">{money(line.cost_micros, call.currency)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {call.prompt_version ? <p className="mt-2 truncate text-xs text-ink/50">{call.prompt_version}</p> : null}
    </li>
  );
}

export function BackofficeAIPricesScreen() {
  const t = useTranslations("aiCosts");
  return (
    <SuperAdminOnly title={t("prices")}>
      <PricesBody />
    </SuperAdminOnly>
  );
}

function PricesBody() {
  const t = useTranslations("aiCosts");
  const unitLabel = useLabel("units");
  const money = useMoney();
  const locale = useLocale();
  const prices = useQuery({
    queryKey: ["backoffice-ai-prices"],
    queryFn: () => api<{ prices: AIModelPrice[]; sync_configured: boolean }>("/v1/backoffice/ai-prices"),
  });
  const missing = useQuery({
    queryKey: ["backoffice-ai-prices-missing"],
    queryFn: () => api<{ missing: AIMissingPrice[] }>("/v1/backoffice/ai-prices/missing"),
  });
  const [showHistory, setShowHistory] = useState(false);
  const syncConfigured = prices.data?.sync_configured ?? false;

  const visible = (prices.data?.prices ?? []).filter((p) => showHistory || !p.effective_to);
  const byModel = new Map<string, AIModelPrice[]>();
  for (const p of visible) {
    const key = `${p.provider}/${p.model}`;
    byModel.set(key, [...(byModel.get(key) ?? []), p]);
  }
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <Link href="/backoffice/costs" className="inline-flex min-h-11 items-center text-sm text-ink/70">
        ← {t("title")}
      </Link>
      <p className="text-sm text-ink/70">{t("pricesLead")}</p>
      {prices.data ? (
        <p
          className={cn(
            "rounded-xl border p-4 text-sm",
            syncConfigured ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10",
          )}
        >
          {syncConfigured ? t("syncOn") : t("syncOff")}
        </p>
      ) : null}

      {(missing.data?.missing.length ?? 0) > 0 ? (
        <section className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <h2 className="text-sm font-semibold">{t("missingTitle")}</h2>
          <p className="text-xs text-ink/70">{syncConfigured ? t("missingSyncHint") : t("missingManualHint")}</p>
          <ul className="space-y-2 text-sm">
            {missing.data!.missing.map((m) => (
              <li key={`${m.provider}/${m.model}/${m.unit}`}>
                <span className="font-medium">
                  {m.provider}/{m.model}
                </span>
                <span className="block text-xs text-ink/70">
                  {m.unit ? unitLabel(m.unit) : t("noUsage")} · {t("callsCount", { count: m.calls })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">{t("currentPrices")}</h2>
          <Button type="button" variant="ghost" className="min-h-11" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? t("hideHistory") : t("showHistory")}
          </Button>
        </div>
        {prices.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {[...byModel.entries()].map(([model, items]) => (
              <div key={model} className="rounded-xl border border-input bg-card p-4">
                <p className="text-sm font-medium">{model}</p>
                <ul className="mt-2 divide-y divide-input text-xs">
                  {items.map((p) => (
                    <li key={p.id} className={cn("flex justify-between gap-3 py-2", p.effective_to ? "text-ink/50" : "")}>
                      <span>
                        <span className="block text-sm text-foreground">{unitLabel(p.unit)}</span>
                        {p.effective_to
                          ? `${dateFormat.format(new Date(p.effective_from))} – ${dateFormat.format(new Date(p.effective_to))}`
                          : t("since", { date: dateFormat.format(new Date(p.effective_from)) })}
                        {` · ${p.source.startsWith("openai_costs_api") ? t("sourceSync") : t("sourceSeed")}`}
                      </span>
                      <span className="shrink-0 self-center text-sm tabular-nums">
                        {money(p.price_micros, p.currency)} / {perLabel(t, p.per_quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function perLabel(t: ReturnType<typeof useTranslations<"aiCosts">>, per: number) {
  if (per === 1_000_000) return t("perMillionShort");
  if (per === 1000) return t("perThousandShort");
  if (per === 1) return t("perOneShort");
  return String(per);
}
