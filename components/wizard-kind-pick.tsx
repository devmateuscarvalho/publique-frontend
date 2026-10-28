"use client";

import { Newspaper, Package, Sparkles, UserRound, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { wizardEmptyClass, wizardFocusClass, wizardSurfaceState } from "@/components/wizard-ui";
import type { OutputKind } from "@/lib/api";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof UserRound> = {
  avatar: UserRound,
  product: Package,
  market_topic: Newspaper,
  mascot: Sparkles,
  team: Users,
};

export function WizardKindPick({
  kinds,
  loading,
  empty,
  onPick,
}: {
  kinds: OutputKind[];
  loading?: boolean;
  empty?: string;
  onPick: (kind: OutputKind) => void;
}) {
  const t = useTranslations();
  const wizard = useTranslations("wizard");

  if (loading) {
    return <p className="text-sm text-ink/65">{wizard("loading")}</p>;
  }

  if (kinds.length === 0) {
    return <p className={wizardEmptyClass}>{empty}</p>;
  }

  return (
    <ul
      className={cn(
        "grid grid-cols-1 gap-3",
        kinds.length > 1 && "sm:grid-cols-2",
        kinds.length > 2 && "lg:grid-cols-3",
      )}
    >
      {kinds.map((kind) => {
        const Icon = ICONS[kind.code] ?? Sparkles;
        return (
          <li key={kind.code} className="min-w-0">
            <button
              type="button"
              className={cn(
                "flex h-full min-h-[4.75rem] w-full items-start gap-3 rounded-lg border p-4 text-left",
                wizardFocusClass,
                wizardSurfaceState(false),
              )}
              onClick={() => onPick(kind)}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-wizard-icon text-pine">
                <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0 flex-1 pt-0.5">
                <span className="block text-sm leading-tight font-semibold">{t(kind.name_key)}</span>
                <span className="mt-1 block text-sm leading-snug text-muted-foreground">{t(kind.blurb_key)}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
