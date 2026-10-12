"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

const DEFAULT_STEPS = ["stepBrand", "stepPreset", "stepPrepare"] as const;

type WizardStepKey = "stepBrand" | "stepKind" | "stepPreset" | "stepPrepare";

export function WizardStepper({
  step,
  steps = DEFAULT_STEPS,
  onGoTo,
}: {
  step: number;
  steps?: readonly WizardStepKey[];
  onGoTo?: (step: number) => void;
}) {
  const t = useTranslations("wizard");

  return (
    <div className="space-y-2.5">
      <ol className="flex items-center gap-1" aria-label={t("stepOf", { step: step + 1, total: steps.length })}>
        {steps.map((key, index) => {
          const done = index < step;
          const current = index === step;
          const canOpen = Boolean(onGoTo) && index < step;
          const circle = (
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                done && "bg-pine text-white",
                current && "bg-foreground text-background",
                !done && !current && "bg-muted text-ink/45",
              )}
            >
              {done ? <Check className="size-3.5" aria-hidden /> : index + 1}
            </span>
          );
          const label = (
            <span
              className={cn(
                "hidden truncate text-xs sm:block",
                current ? "font-medium text-ink" : "text-ink/45",
                canOpen && "underline-offset-2 group-hover:underline",
              )}
            >
              {t(key)}
            </span>
          );
          return (
            <li key={key} className="flex min-w-0 flex-1 items-center gap-1.5">
              {canOpen ? (
                <button
                  type="button"
                  className="group flex min-h-11 min-w-0 items-center gap-1.5 text-left"
                  onClick={() => onGoTo?.(index)}
                >
                  {circle}
                  {label}
                </button>
              ) : (
                <span className="flex min-w-0 items-center gap-1.5" aria-current={current ? "step" : undefined}>
                  {circle}
                  {label}
                </span>
              )}
              {index < steps.length - 1 ? <span className="h-px min-w-3 flex-1 bg-input" aria-hidden /> : null}
            </li>
          );
        })}
      </ol>
      <p className="text-xs font-medium text-ink sm:hidden">{t(steps[step] ?? steps[0])}</p>
    </div>
  );
}
