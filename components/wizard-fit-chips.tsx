"use client";

import { useTranslations } from "next-intl";

import { wizardFocusClass } from "@/components/wizard-ui";
import type { OfferingChip } from "@/lib/look-fits";
import { cn } from "@/lib/utils";

const chips: OfferingChip[] = ["", "physical", "digital", "service"];

export function WizardFitChips({
  value,
  onChange,
}: {
  value: OfferingChip;
  onChange: (next: OfferingChip) => void;
}) {
  const t = useTranslations("wizard");
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("fitFilterLabel")}>
      {chips.map((chip) => {
        const active = value === chip;
        return (
          <button
            key={chip || "all"}
            type="button"
            aria-pressed={active}
            className={cn(
              "min-h-11 rounded-full border px-3 text-sm font-medium",
              wizardFocusClass,
              active ? "border-pine bg-pine text-white" : "border-border bg-card text-foreground",
            )}
            onClick={() => onChange(chip)}
          >
            {t(chip ? `fitBadge.${chip}` : "fitAll")}
          </button>
        );
      })}
    </div>
  );
}
