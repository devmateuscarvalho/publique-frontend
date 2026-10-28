"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ComponentProps } from "react";
import { enUS, ptBR } from "react-day-picker/locale";

import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type CalendarView = "week" | "month" | "agenda";

const segment =
  "inline-flex h-11 min-w-0 items-center justify-center text-sm transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

export function CalendarToolbar({
  view,
  label,
  cursorDate,
  todayDate,
  timeZone,
  cursorIsToday,
  onShift,
  onToday,
  onView,
  onPick,
}: {
  view: CalendarView;
  label: string;
  cursorDate: Date;
  todayDate: Date;
  timeZone: string;
  cursorIsToday: boolean;
  onShift: (direction: -1 | 1) => void;
  onToday: () => void;
  onView: (view: CalendarView) => void;
  onPick: (date: Date) => void;
}) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(cursorDate);
  const dayPickerLocale = locale.startsWith("pt") ? ptBR : enUS;

  return (
    <div className="@container">
      <div className="flex flex-col gap-2 @4xl:flex-row @4xl:items-center @4xl:justify-between @4xl:gap-3">
        <div
          className="flex h-11 w-full min-w-0 divide-x divide-line overflow-hidden rounded-md border border-line bg-card @4xl:w-max @4xl:max-w-full"
          role="group"
          aria-label={t("dateNav")}
        >
          <button type="button" className={cn(segment, "w-11 shrink-0 text-ink hover:bg-sand")} aria-label={t("previous")} onClick={() => onShift(-1)}>
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            className={cn(segment, "shrink-0 px-3 hover:bg-sand", cursorIsToday ? "font-medium text-pine" : "text-ink")}
            aria-current={cursorIsToday ? "date" : undefined}
            onClick={onToday}
          >
            {t("today")}
          </button>
          <Popover
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (next) {
                setMonth(cursorDate);
              }
            }}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(segment, "min-w-0 flex-1 gap-1.5 px-3 font-medium text-ink hover:bg-sand @4xl:flex-none")}
                aria-label={t("jumpToDate", { period: label })}
              >
                <span className="min-w-0 truncate tabular-nums">{label}</span>
                <ChevronDown className={cn("size-3.5 shrink-0 text-ink/50 transition-transform", open && "rotate-180")} aria-hidden />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={6}
              collisionPadding={12}
              className="w-auto max-w-[calc(100vw-2rem)] p-0"
              onOpenAutoFocus={(event) => {
                const selected = (event.currentTarget as HTMLElement).querySelector<HTMLElement>("[data-selected-single=true]");
                if (!selected) {
                  return;
                }
                event.preventDefault();
                selected.focus();
              }}
            >
              <Calendar
                mode="single"
                required
                timeZone={timeZone}
                noonSafe
                weekStartsOn={1}
                locale={dayPickerLocale}
                selected={cursorDate}
                today={todayDate}
                month={month}
                onMonthChange={setMonth}
                onSelect={(date) => {
                  onPick(date);
                  setOpen(false);
                }}
                components={{ DayButton: PeriodDayButton }}
              />
            </PopoverContent>
          </Popover>
          <button type="button" className={cn(segment, "w-11 shrink-0 text-ink hover:bg-sand")} aria-label={t("next")} onClick={() => onShift(1)}>
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>

        <div
          className="grid h-11 w-full grid-cols-3 divide-x divide-line overflow-hidden rounded-md border border-line bg-card @4xl:w-auto @4xl:min-w-60"
          role="tablist"
          aria-label={t("views")}
        >
          {(["week", "month", "agenda"] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={view === item}
              className={cn(
                segment,
                "px-3",
                view === item ? "bg-foreground text-background" : "text-ink/70 hover:bg-sand hover:text-ink",
              )}
              onClick={() => onView(item)}
            >
              {t(item)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PeriodDayButton({ className, modifiers, ...props }: ComponentProps<typeof CalendarDayButton>) {
  const today = Boolean(modifiers.today);
  const selected = Boolean(modifiers.selected);
  return (
    <CalendarDayButton
      {...props}
      modifiers={modifiers}
      className={cn(className, today && !selected && "font-semibold text-pine ring-1 ring-pine/70 ring-inset")}
    />
  );
}
