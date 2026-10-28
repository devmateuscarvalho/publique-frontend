"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { wizardFocusClass } from "@/components/wizard-ui";
import { cn } from "@/lib/utils";

export const WIZARD_STEPS = ["stepBrand", "stepKind", "stepPreset", "stepPrepare", "stepWhen"] as const;

type WizardStepKey = (typeof WIZARD_STEPS)[number];

export function WizardStepper({
  step,
  steps = WIZARD_STEPS,
  onGoTo,
}: {
  step: number;
  steps?: readonly WizardStepKey[];
  onGoTo?: (step: number) => void;
}) {
  const t = useTranslations("wizard");
  const currentKey = steps[step] ?? steps[0];

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3 sm:hidden">
        <p className="min-w-0 truncate text-sm font-medium text-ink">{t(currentKey)}</p>
        <p className="shrink-0 text-xs font-medium tracking-wide text-muted-foreground tabular-nums">
          {step + 1}/{steps.length}
        </p>
      </div>
      <ol
        className="grid"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        aria-label={t("stepOf", { step: step + 1, total: steps.length })}
      >
        {steps.map((key, index) => {
          const done = index < step;
          const current = index === step;
          const canOpen = Boolean(onGoTo) && index < step;
          const marker = (
            <span
              className={cn(
                "relative z-10 grid size-6 place-items-center rounded-full text-[11px] font-semibold tabular-nums transition-colors duration-200 motion-reduce:transition-none",
                done && "border border-pine/35 bg-wizard-icon text-pine",
                current && "bg-pine text-white shadow-[0_0_0_3px_color-mix(in_srgb,var(--pine)_16%,transparent)]",
                !done && !current && "border border-border bg-card text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3" strokeWidth={2.5} aria-hidden /> : index + 1}
            </span>
          );
          const label = (
            <span
              className={cn(
                "hidden w-full truncate px-1 text-center text-xs sm:block",
                current ? "font-medium text-ink" : done ? "text-ink/75" : "text-muted-foreground",
              )}
            >
              {t(key)}
            </span>
          );
          const control = (
            <span className="flex w-full min-w-0 flex-col items-center gap-1.5">
              {marker}
              {label}
            </span>
          );
          return (
            <li key={key} className="relative min-w-0">
              {index > 0 ? (
                <span
                  className={cn("absolute top-3 right-1/2 left-0 z-0 h-px", index <= step ? "bg-pine/40" : "bg-border")}
                  aria-hidden
                />
              ) : null}
              {index < steps.length - 1 ? (
                <span
                  className={cn("absolute top-3 right-0 left-1/2 z-0 h-px", index < step ? "bg-pine/40" : "bg-border")}
                  aria-hidden
                />
              ) : null}
              {canOpen ? (
                <button
                  type="button"
                  className={cn("flex min-h-11 w-full items-start justify-center rounded-md py-0", wizardFocusClass)}
                  onClick={() => onGoTo?.(index)}
                >
                  {control}
                </button>
              ) : (
                <span className="flex min-h-11 w-full items-start justify-center" aria-current={current ? "step" : undefined}>
                  {control}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
