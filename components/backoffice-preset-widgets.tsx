"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { type BrandToken, type LogoPlacement, tokenLabelKey } from "@/lib/backoffice-preset-shared";
import { cn } from "@/lib/utils";

export type EffectivePrompt = {
  kind: string;
  recipe?: string;
  system?: string;
  user?: string;
  sent: string;
};

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

/** @deprecated Prefer EffectivePromptPanel — kept for any residual call sites. */
export function ResolvedPromptDisclosure({ value }: { value: string }) {
  return <EffectivePromptPanel prompts={value.trim() ? [{ kind: "legacy", sent: value }] : []} />;
}

function kindLabel(kind: string, t: (key: string) => string): string {
  const known = ["image", "caption", "research", "deck", "carousel_script", "legacy"];
  if (known.includes(kind)) {
    return t(`effectiveKind.${kind}`);
  }
  return kind;
}

export function EffectivePromptPanel({
  prompts,
  emptyHint,
}: {
  prompts: readonly EffectivePrompt[];
  emptyHint?: string;
}) {
  const t = useTranslations("backoffice");
  const items = prompts.filter((p) => p.sent.trim() || p.system?.trim() || p.recipe?.trim());

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/15 p-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-ink">{t("effectivePromptTitle")}</p>
        <p className="text-sm text-ink/70">{t("effectivePromptHint")}</p>
      </div>
      {items.length === 0 ? (
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background/70 p-3 text-sm leading-relaxed text-ink/60">
          {emptyHint ?? t("effectivePromptEmpty")}
        </pre>
      ) : (
        items.map((item, index) => (
          <details
            key={`${item.kind}-${index}`}
            open
            className="group rounded-md border border-border bg-background/60"
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-ink marker:content-none [&::-webkit-details-marker]:hidden">
              <span>{kindLabel(item.kind, t)}</span>
              <ChevronDown
                className="size-4 shrink-0 text-ink/55 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="space-y-3 border-t border-border px-3 py-3">
              {item.recipe?.trim() ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink/50">
                    {t("effectiveRecipe")}
                  </p>
                  <pre className="max-h-36 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/20 p-3 text-sm leading-relaxed text-ink">
                    {item.recipe}
                  </pre>
                </div>
              ) : null}
              {item.system?.trim() ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink/50">
                    {t("effectiveSystem")}
                  </p>
                  <pre className="max-h-36 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/20 p-3 text-sm leading-relaxed text-ink">
                    {item.system}
                  </pre>
                </div>
              ) : null}
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-ink/50">
                  {t("effectiveSent")}
                </p>
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-amber-500/30 bg-amber-50/40 p-3 text-sm leading-relaxed text-ink dark:bg-amber-950/20">
                  {item.sent.trim() ? item.sent : t("effectivePromptEmpty")}
                </pre>
              </div>
            </div>
          </details>
        ))
      )}
    </div>
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
