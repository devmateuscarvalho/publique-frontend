"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { type BrandToken, type LogoPlacement, tokenLabelKey } from "@/lib/backoffice-preset-shared";
import { cn } from "@/lib/utils";

export function BrandTokenButtons({
  tokens,
  onInsert,
}: {
  tokens: readonly BrandToken[];
  onInsert: (token: BrandToken) => void;
}) {
  const t = useTranslations("backoffice");
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-ink/55">{t("tokensLabel")}</p>
      <div className="flex flex-wrap gap-2">
        {tokens.map((token) => (
          <button
            key={token}
            type="button"
            className="min-h-11 rounded-full border border-amber-500/40 bg-amber-400 px-3.5 text-sm font-semibold text-stone-950 shadow-sm transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onInsert(token)}
            title={t("tokenInsertHint", { label: t(`tokenLabels.${tokenLabelKey(token)}`) })}
          >
            {t(`tokenLabels.${tokenLabelKey(token)}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ResolvedPromptDisclosure({ value }: { value: string }) {
  const t = useTranslations("backoffice");
  return (
    <details className="group rounded-lg border border-border bg-muted/20">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-ink marker:content-none [&::-webkit-details-marker]:hidden">
        <span>{t("resolvedPrompt")}</span>
        <ChevronDown
          className="size-4 shrink-0 text-ink/55 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="space-y-2 border-t border-border px-3 py-3">
        <p className="text-sm text-ink/70">{t("resolvedPromptHint")}</p>
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background/70 p-3 text-sm leading-relaxed text-ink">
          {value.trim() ? value : t("resolvedPromptEmpty")}
        </pre>
      </div>
    </details>
  );
}

export function LogoPlacementGrid({
  value,
  onChange,
}: {
  value: LogoPlacement;
  onChange: (value: LogoPlacement) => void;
}) {
  const cells: Array<LogoPlacement | null> = [
    "top_left",
    null,
    "top_right",
    null,
    "center",
    null,
    "bottom_left",
    null,
    "bottom_right",
  ];
  return (
    <div className="grid max-w-[11rem] grid-cols-3 gap-1 rounded-lg border border-input p-1" role="group">
      {cells.map((cell, index) =>
        cell ? (
          <button
            key={cell}
            type="button"
            aria-pressed={value === cell}
            className={cn(
              "flex min-h-11 items-center justify-center rounded-md text-[10px] uppercase tracking-wide transition-colors",
              value === cell ? "bg-foreground text-background" : "bg-muted/40 text-ink/60 hover:bg-muted",
            )}
            onClick={() => onChange(cell)}
          >
            ●
          </button>
        ) : (
          <div key={`empty-${index}`} className="min-h-11 rounded-md bg-transparent" aria-hidden />
        ),
      )}
    </div>
  );
}
