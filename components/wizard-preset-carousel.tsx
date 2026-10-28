"use client";

import { Check, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { wizardSurfaceState } from "@/components/wizard-ui";
import type { CreativeRecipe } from "@/lib/api";
import { usePresetCopy } from "@/lib/preset-i18n";
import { cn } from "@/lib/utils";

type Props = {
  recipes: CreativeRecipe[];
  selectedId: string;
  onSelect: (recipe: CreativeRecipe) => void;
  onPreview?: (recipe: CreativeRecipe) => void;
  onConfirm?: (recipe: CreativeRecipe) => void;
  kindLabel: (kind: string) => string;
  prevLabel: string;
  nextLabel: string;
  label: string;
};

function lookAspect(kind: string) {
  return kind === "market_topic" ? "aspect-[4/5]" : "aspect-square";
}

function LookImage({ src, aspect }: { src: string; aspect: string }) {
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  if (!src || failed) {
    return <span className={cn("block w-full bg-muted", aspect)} />;
  }
  return (
    <span className={cn("relative block w-full bg-muted", aspect)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        draggable={false}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-200 motion-reduce:transition-none",
          ready ? "opacity-100" : "opacity-0",
        )}
        onLoad={() => setReady(true)}
        onError={() => setFailed(true)}
      />
    </span>
  );
}

const zoneFocusClass =
  "outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-pine/45 focus-visible:ring-inset motion-reduce:transition-none";

export function WizardPresetCarousel({
  recipes,
  selectedId,
  onSelect,
  onPreview,
  onConfirm,
  kindLabel,
  label,
}: Props) {
  const copy = usePresetCopy();
  const t = useTranslations("wizard");

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    const node = document.getElementById(`wizard-look-${selectedId}`);
    if (!node) {
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [selectedId]);

  if (recipes.length === 0) {
    return null;
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label={label}>
      {recipes.map((recipe) => {
        const active = recipe.id === selectedId;
        const aspect = lookAspect(recipe.output_kind);
        const name = copy.name(recipe);
        return (
          <li key={recipe.id} className="flex min-w-0">
            <div className={cn("flex w-full flex-col overflow-hidden rounded-lg border", wizardSurfaceState(active))}>
              <button
                type="button"
                className={cn("relative block w-full bg-muted text-left", zoneFocusClass)}
                aria-label={t("gallerySeeOnPhoneAria", { name })}
                onClick={() => onPreview?.(recipe)}
              >
                <LookImage src={recipe.preview_path} aspect={aspect} />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 flex min-h-11 items-center justify-center gap-1.5 bg-gradient-to-t from-black/80 via-black/55 to-transparent px-3 pt-6 pb-2.5 text-[13px] font-medium text-white">
                  <Smartphone className="size-4 shrink-0" aria-hidden />
                  {t("gallerySeeOnPhone")}
                </span>
              </button>
              <button
                id={`wizard-look-${recipe.id}`}
                type="button"
                aria-pressed={active}
                className={cn(
                  "flex min-h-11 flex-1 flex-col gap-1 border-t border-border px-3.5 py-3 text-left",
                  zoneFocusClass,
                )}
                onClick={() => onSelect(recipe)}
                onDoubleClick={() => onConfirm?.(recipe)}
              >
                <span className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  {kindLabel(recipe.output_kind)}
                </span>
                <span className="line-clamp-2 font-display text-sm leading-tight font-semibold">{name}</span>
                <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{copy.blurb(recipe)}</span>
                <span
                  className={cn(
                    "mt-auto flex items-center gap-2 pt-1 text-sm font-medium",
                    active ? "text-pine" : "text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border",
                      active ? "border-pine bg-pine text-white" : "border-foreground/35",
                    )}
                    aria-hidden
                  >
                    {active ? <Check className="size-3" strokeWidth={2.75} /> : null}
                  </span>
                  {active ? t("galleryChosen") : t("galleryChoose")}
                </span>
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
