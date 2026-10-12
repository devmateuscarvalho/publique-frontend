"use client";

import { useTranslations } from "next-intl";

import { InstagramPhonePreview } from "@/components/instagram-phone-preview";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { visualLogoUrl } from "@/components/wizard-brand-mark";
import type { CreativeRecipe, VisualResponse } from "@/lib/api";
import { usePresetCopy } from "@/lib/preset-i18n";
import { cn } from "@/lib/utils";

export function WizardLookPreview({
  open,
  recipe,
  brandName,
  visual,
  emptyImageLabel,
  emptyCaptionLabel,
  generatingCaptionLabel,
  likesLabel,
  onOpenChange,
}: {
  open: boolean;
  recipe?: CreativeRecipe | null;
  brandName: string;
  visual?: VisualResponse["identity"];
  emptyImageLabel: string;
  emptyCaptionLabel: string;
  generatingCaptionLabel: string;
  likesLabel: string;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("wizard");
  const copy = usePresetCopy();
  const slides = lookPreviewSlides(recipe);
  const portrait = recipe?.output_kind === "market_topic" || slides.length > 1;
  const lookName = recipe ? copy.name(recipe) : t("previewTitle");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "inset-auto bottom-auto left-1/2 right-auto top-1/2 h-auto w-auto max-w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2",
          "border-0 bg-transparent p-0 shadow-none",
          "data-[state=closed]:slide-out-to-bottom-0 data-[state=open]:slide-in-from-bottom-0",
          "[&>button]:hidden",
        )}
      >
        <SheetTitle className="sr-only">{lookName}</SheetTitle>
        <SheetDescription className="sr-only">{t("previewTitle")}</SheetDescription>
        <div className="w-[min(22rem,calc(100vw-1.5rem),calc((100svh-2rem)*433/882))]">
          <InstagramPhonePreview
            brandName={brandName}
            logoUrl={visualLogoUrl(visual)}
            logoInvertedUrl={visual?.logo_inverted_url}
            imageUrl={slides[0]}
            imageUrls={slides.length > 1 ? slides : undefined}
            aspect={portrait ? "portrait" : "square"}
            caption={lookPreviewCaption(recipe)}
            emptyImageLabel={emptyImageLabel}
            emptyCaptionLabel={emptyCaptionLabel}
            generatingCaptionLabel={generatingCaptionLabel}
            likesLabel={likesLabel}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function lookPreviewCaption(recipe?: CreativeRecipe | null): string {
  if (!recipe) {
    return "";
  }
  return recipe.result_text?.trim() || recipe.preview_caption?.trim() || "";
}

function lookPreviewSlides(recipe?: CreativeRecipe | null): string[] {
  const fromAssets = (recipe?.preview_slides ?? []).map((item) => item.trim()).filter(Boolean);
  if (fromAssets.length > 0) {
    return fromAssets;
  }
  const preview = recipe?.preview_path?.trim();
  return preview ? [preview] : [];
}
