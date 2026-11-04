"use client";

import { CalendarDays, ChevronDown } from "lucide-react";
import { useLocale } from "next-intl";
import { useState, type ComponentProps, type ReactNode } from "react";
import type { DateRange } from "react-day-picker";
import { enUS, ptBR } from "react-day-picker/locale";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export const PERIOD_PRESETS = ["today", "7d", "30d", "month", "last_month", "90d"] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

const pad = (n: number) => String(n).padStart(2, "0");

export const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);

export function fromYmd(raw: string | null): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw ?? "");
  if (!match) {
    return null;
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Inclusive local days for a preset, in the browser zone. */
export function presetRange(preset: PeriodPreset, today = startOfToday()): { from: Date; to: Date } {
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

export function DateRangeFilter({
  from,
  to,
  onChange,
  periodLabel,
  presetLabel,
  pickEndLabel,
}: {
  from: Date;
  to: Date;
  onChange: (range: { from: Date; to: Date }) => void;
  periodLabel: string;
  presetLabel: (preset: PeriodPreset) => string;
  pickEndLabel: string;
}) {
  const locale = useLocale();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();
  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });
  const preset = PERIOD_PRESETS.find((item) => {
    const range = presetRange(item);
    return toYmd(range.from) === toYmd(from) && toYmd(range.to) === toYmd(to);
  });
  const label = preset ? presetLabel(preset) : fmt.formatRange(from, to);
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
        <FilterTrigger active aria-label={periodLabel}>
          <CalendarDays className="size-4" />
          <span className="max-w-56 truncate">{label}</span>
          <ChevronDown className="size-4 opacity-70" />
        </FilterTrigger>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] p-0">
        <div className="flex flex-col md:flex-row">
          <div className="grid grid-cols-2 gap-1 border-b border-input p-2 md:flex md:w-44 md:flex-col md:border-r md:border-b-0">
            {PERIOD_PRESETS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  onChange(presetRange(item));
                  setOpen(false);
                }}
                className={cn(
                  "min-h-11 rounded-md px-3 text-left text-sm",
                  item === preset ? "bg-foreground text-background" : "hover:bg-muted",
                )}
              >
                {presetLabel(item)}
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
            {draft ? <p className="px-3 pb-3 text-xs text-ink/60">{pickEndLabel}</p> : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
