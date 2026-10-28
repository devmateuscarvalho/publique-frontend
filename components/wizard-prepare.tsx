"use client";

import { useTranslations } from "next-intl";

import { LogoPlacementGrid } from "@/components/backoffice-preset-widgets";
import { WizardLibrary } from "@/components/wizard-library";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { wizardControlClass, wizardHintClass, wizardPanelClass, WizardStepHeader } from "@/components/wizard-ui";
import type { BrandItem, CreativeRecipe } from "@/lib/api";
import type { LogoPlacement } from "@/lib/backoffice-preset-shared";
import { type OfferingChip } from "@/lib/look-fits";
import { logoPlacements } from "@/lib/post-template";

export type WizardProduct = {
  name: string;
  price: string;
  description: string;
};

export type WizardCarouselTheme = "light" | "dark" | "random";
export type WizardMood = "" | "warm" | "bold" | "calm" | "casual";
/** Prepare UI keys — mapped to API `1:1` | `4:5` | `9:16` on generate. */
export type WizardAspect = "square" | "portrait" | "story";

export function aspectToAPI(aspect: WizardAspect): "1:1" | "4:5" | "9:16" {
  if (aspect === "portrait") {
    return "4:5";
  }
  if (aspect === "story") {
    return "9:16";
  }
  return "1:1";
}

export function normalizeLogoPlacement(value?: string): LogoPlacement {
  if (value && (logoPlacements as readonly string[]).includes(value)) {
    return value as LogoPlacement;
  }
  return "bottom_right";
}

export function wizardScreenKind(recipe?: CreativeRecipe | null) {
  if (!recipe) {
    return "avatar";
  }
  if (recipe.output_kind === "product") {
    return "product";
  }
  if (recipe.output_kind === "avatar") {
    return "avatar";
  }
  if (recipe.lab_visual_format === "single") {
    return "single";
  }
  return "carousel";
}

function WizardLogoControls({
  includeLogo,
  onIncludeLogo,
  logoPlacement,
  onLogoPlacement,
  hint,
}: {
  includeLogo: boolean;
  onIncludeLogo: (value: boolean) => void;
  logoPlacement: LogoPlacement;
  onLogoPlacement: (value: LogoPlacement) => void;
  hint: string;
}) {
  const t = useTranslations("wizard");
  const creation = useTranslations("creation");

  return (
    <div className={`${wizardPanelClass} space-y-3 p-4 md:p-5`}>
      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 accent-pine"
          checked={includeLogo}
          onChange={(event) => onIncludeLogo(event.target.checked)}
        />
        <span>
          <span className="block font-medium">{t("includeLogo")}</span>
          <span className={`mt-0.5 block ${wizardHintClass}`}>{hint}</span>
        </span>
      </label>
      {includeLogo ? (
        <div className="space-y-2 border-t border-border pt-4">
          <Label>{t("logoAdvanced")}</Label>
          <p className={wizardHintClass}>{t("logoPlacementHint")}</p>
          <Select
            value={logoPlacement}
            onValueChange={(value) => {
              if ((logoPlacements as readonly string[]).includes(value)) {
                onLogoPlacement(value as LogoPlacement);
              }
            }}
          >
            <SelectTrigger className={wizardControlClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {logoPlacements.map((item) => (
                <SelectItem key={item} value={item}>
                  {creation(`logoPlacements.${item}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <LogoPlacementGrid value={logoPlacement} onChange={onLogoPlacement} />
        </div>
      ) : null}
    </div>
  );
}

export function WizardPrepare({
  recipe,
  includeLogo,
  onIncludeLogo,
  logoPlacement,
  onLogoPlacement,
  product,
  onProduct,
  carouselTheme,
  onCarouselTheme,
  mood,
  onMood,
  aspect,
  onAspect,
  brandId,
  offering,
  libraryItem,
  onLibraryItem,
  placeItem,
  onPlaceItem,
}: {
  recipe?: CreativeRecipe | null;
  includeLogo: boolean;
  onIncludeLogo: (value: boolean) => void;
  logoPlacement: LogoPlacement;
  onLogoPlacement: (value: LogoPlacement) => void;
  product: WizardProduct;
  onProduct: (next: WizardProduct) => void;
  carouselTheme: WizardCarouselTheme;
  onCarouselTheme: (next: WizardCarouselTheme) => void;
  mood: WizardMood;
  onMood: (next: WizardMood) => void;
  aspect: WizardAspect;
  onAspect: (next: WizardAspect) => void;
  brandId: string;
  offering: OfferingChip;
  libraryItem: BrandItem | null;
  onLibraryItem: (item: BrandItem | null) => void;
  placeItem: BrandItem | null;
  onPlaceItem: (item: BrandItem | null) => void;
}) {
  const t = useTranslations("wizard");
  const kind = wizardScreenKind(recipe);
  const showLogo = kind !== "carousel";
  const showRefs = kind === "product" || kind === "avatar";
  const showCarousel = kind === "carousel";
  const showImageDirection = kind === "single";
  return (
    <div className="space-y-5">
      <WizardStepHeader title={t(`prepareTitle.${kind}`)} lead={t(`prepareLead.${kind}`)} />

      {showCarousel ? (
        <div className={`${wizardPanelClass} space-y-1.5 p-4 sm:max-w-md sm:p-5`}>
          <Label htmlFor="wizard-carousel-theme">{t("carouselTheme")}</Label>
          <p className={wizardHintClass}>{t("carouselThemeHint")}</p>
          <Select
            value={carouselTheme}
            onValueChange={(value) => {
              const next: WizardCarouselTheme = value === "light" || value === "random" ? value : "dark";
              onCarouselTheme(next);
            }}
          >
            <SelectTrigger id="wizard-carousel-theme" className={wizardControlClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">{t("carouselThemeDark")}</SelectItem>
              <SelectItem value="light">{t("carouselThemeLight")}</SelectItem>
              <SelectItem value="random">{t("carouselThemeRandom")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {showImageDirection ? (
        <div className={`${wizardPanelClass} grid gap-5 p-4 sm:grid-cols-2 sm:p-5`}>
          <div className="space-y-1.5">
            <Label htmlFor="wizard-mood">{t("mood")}</Label>
            <p className={wizardHintClass}>{t("moodHint")}</p>
            <Select
              value={mood || "default"}
              onValueChange={(value) => {
                const next: WizardMood =
                  value === "warm" || value === "bold" || value === "calm" || value === "casual"
                    ? value
                    : "";
                onMood(next);
              }}
            >
              <SelectTrigger id="wizard-mood" className={wizardControlClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{t("moodDefault")}</SelectItem>
                <SelectItem value="warm">{t("moodWarm")}</SelectItem>
                <SelectItem value="bold">{t("moodBold")}</SelectItem>
                <SelectItem value="calm">{t("moodCalm")}</SelectItem>
                <SelectItem value="casual">{t("moodCasual")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:border-l sm:border-border sm:pl-5">
            <Label htmlFor="wizard-aspect">{t("aspect")}</Label>
            <p className={wizardHintClass}>{t("aspectHint")}</p>
            <Select
              value={aspect}
              onValueChange={(value) => {
                const next: WizardAspect =
                  value === "portrait" || value === "story" ? value : "square";
                onAspect(next);
              }}
            >
              <SelectTrigger id="wizard-aspect" className={wizardControlClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="square">{t("aspectSquare")}</SelectItem>
                <SelectItem value="portrait">{t("aspectPortrait")}</SelectItem>
                <SelectItem value="story">{t("aspectStory")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      {showRefs ? (
        <WizardLibrary
          brandId={brandId}
          recipe={recipe}
          offering={offering}
          item={libraryItem}
          onItem={onLibraryItem}
          product={product}
          onProduct={onProduct}
          place={placeItem}
          onPlace={onPlaceItem}
        />
      ) : null}

      {showLogo ? (
        <WizardLogoControls
          includeLogo={includeLogo}
          onIncludeLogo={onIncludeLogo}
          logoPlacement={logoPlacement}
          onLogoPlacement={onLogoPlacement}
          hint={t("prepareLogoHint")}
        />
      ) : null}

    </div>
  );
}
