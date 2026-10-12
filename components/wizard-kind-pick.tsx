"use client";

import { Newspaper, Package, Sparkles, UserRound, Users } from "lucide-react";
import { useTranslations } from "next-intl";

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
    return <p className="text-sm text-ink/70">{wizard("loading")}</p>;
  }

  if (kinds.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-input bg-card p-5 text-sm text-ink/70">
        {empty}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {kinds.map((kind) => {
        const Icon = ICONS[kind.code] ?? Sparkles;
        return (
          <li key={kind.code}>
            <button
              type="button"
              className={cn(
                "flex min-h-16 w-full items-center gap-3 rounded-2xl border border-input bg-card px-3 py-3 text-left shadow-sm",
                "transition hover:border-pine/35 hover:bg-pine/5",
              )}
              onClick={() => onPick(kind)}
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-ink">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{t(kind.name_key)}</span>
                <span className="mt-0.5 block text-xs text-ink/60">{t(kind.blurb_key)}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
