"use client";

import { useTranslations } from "next-intl";

import { LogoPlacementGrid } from "@/components/backoffice-preset-widgets";
import { WizardRefs, type WizardLocalRef } from "@/components/wizard-refs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CreativeRecipe } from "@/lib/api";
import type { LogoPlacement } from "@/lib/backoffice-preset-shared";
import { logoPlacements } from "@/lib/post-template";

export type WizardProduct = {
  name: string;
  price: string;
  description: string;
};

export type WizardCarouselTheme = "light" | "dark" | "random";
export type WizardCarouselLayout = "editorial" | "statement" | "steps";
export type WizardMood = "" | "warm" | "bold" | "calm" | "casual";
export type WizardAspect = "1:1" | "4:5" | "9:16";

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
    <div className="space-y-3 rounded-2xl border border-input bg-card p-4 shadow-sm">
      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1 size-4 rounded border-input"
          checked={includeLogo}
          onChange={(event) => onIncludeLogo(event.target.checked)}
        />
        <span>
          <span className="block font-medium">{t("includeLogo")}</span>
          <span className="mt-0.5 block text-ink/70">{hint}</span>
        </span>
      </label>
      {includeLogo ? (
        <div className="space-y-2 border-t border-input pt-3">
          <Label>{t("logoAdvanced")}</Label>
          <p className="text-sm text-ink/70">{t("logoPlacementHint")}</p>
          <Select
            value={logoPlacement}
            onValueChange={(value) => {
              if ((logoPlacements as readonly string[]).includes(value)) {
                onLogoPlacement(value as LogoPlacement);
              }
            }}
          >
            <SelectTrigger className="min-h-11">
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
  refs,
  onAdd,
  onRemove,
  product,
  onProduct,
  carouselTheme,
  onCarouselTheme,
  carouselLayout,
  onCarouselLayout,
  mood,
  onMood,
  aspect,
  onAspect,
}: {
  recipe?: CreativeRecipe | null;
  includeLogo: boolean;
  onIncludeLogo: (value: boolean) => void;
  logoPlacement: LogoPlacement;
  onLogoPlacement: (value: LogoPlacement) => void;
  refs: WizardLocalRef[];
  onAdd: (role: "person" | "location", file: File) => void;
  onRemove: (key: string) => void;
  product: WizardProduct;
  onProduct: (next: WizardProduct) => void;
  carouselTheme: WizardCarouselTheme;
  onCarouselTheme: (next: WizardCarouselTheme) => void;
  carouselLayout: WizardCarouselLayout;
  onCarouselLayout: (next: WizardCarouselLayout) => void;
  mood: WizardMood;
  onMood: (next: WizardMood) => void;
  aspect: WizardAspect;
  onAspect: (next: WizardAspect) => void;
}) {
  const t = useTranslations("wizard");
  const kind = wizardScreenKind(recipe);
  const showLogo = kind !== "carousel";
  const showRefs = kind === "product" || kind === "avatar";
  const showCarousel = kind === "carousel";
  const showImageDirection = kind === "product" || kind === "avatar" || kind === "single";

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold md:text-xl">{t(`prepareTitle.${kind}`)}</h2>
        <p className="text-sm text-ink/70">{t(`prepareLead.${kind}`)}</p>
      </div>

      {showCarousel ? (
        <div className="space-y-4 rounded-2xl border border-input bg-card p-4 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="wizard-carousel-theme">{t("carouselTheme")}</Label>
            <p className="text-sm text-ink/70">{t("carouselThemeHint")}</p>
            <Select
              value={carouselTheme}
              onValueChange={(value) => {
                const next: WizardCarouselTheme =
                  value === "light" || value === "random" ? value : "dark";
                onCarouselTheme(next);
              }}
            >
              <SelectTrigger id="wizard-carousel-theme" className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">{t("carouselThemeDark")}</SelectItem>
                <SelectItem value="light">{t("carouselThemeLight")}</SelectItem>
                <SelectItem value="random">{t("carouselThemeRandom")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 border-t border-input pt-3">
            <Label htmlFor="wizard-carousel-layout">{t("carouselLayout")}</Label>
            <p className="text-sm text-ink/70">{t("carouselLayoutHint")}</p>
            <Select
              value={carouselLayout}
              onValueChange={(value) => {
                const next: WizardCarouselLayout =
                  value === "statement" || value === "steps" ? value : "editorial";
                onCarouselLayout(next);
              }}
            >
              <SelectTrigger id="wizard-carousel-layout" className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editorial">{t("carouselLayoutEditorial")}</SelectItem>
                <SelectItem value="statement">{t("carouselLayoutStatement")}</SelectItem>
                <SelectItem value="steps">{t("carouselLayoutSteps")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      {showImageDirection ? (
        <div className="space-y-4 rounded-2xl border border-input bg-card p-4 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="wizard-mood">{t("mood")}</Label>
            <p className="text-sm text-ink/70">{t("moodHint")}</p>
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
              <SelectTrigger id="wizard-mood" className="min-h-11">
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
          <div className="space-y-2 border-t border-input pt-3">
            <Label htmlFor="wizard-aspect">{t("aspect")}</Label>
            <p className="text-sm text-ink/70">{t("aspectHint")}</p>
            <Select
              value={aspect}
              onValueChange={(value) => {
                const next: WizardAspect =
                  value === "4:5" || value === "9:16" ? value : "1:1";
                onAspect(next);
              }}
            >
              <SelectTrigger id="wizard-aspect" className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1:1">{t("aspectSquare")}</SelectItem>
                <SelectItem value="4:5">{t("aspectPortrait")}</SelectItem>
                <SelectItem value="9:16">{t("aspectStory")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      {kind === "product" ? (
        <div className="space-y-3 rounded-2xl border border-input bg-card p-4 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="wizard-product-name">{t("productName")}</Label>
            <Input
              id="wizard-product-name"
              className="min-h-11"
              value={product.name}
              onChange={(event) => onProduct({ ...product, name: event.target.value })}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-product-price">{t("productPrice")}</Label>
            <Input
              id="wizard-product-price"
              className="min-h-11"
              value={product.price}
              onChange={(event) => onProduct({ ...product, price: event.target.value })}
              placeholder={t("productPricePlaceholder")}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-product-description">{t("productDescription")}</Label>
            <Textarea
              id="wizard-product-description"
              className="min-h-24"
              value={product.description}
              onChange={(event) => onProduct({ ...product, description: event.target.value })}
            />
          </div>
        </div>
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

      {showRefs ? (
        <WizardRefs
          outputKind={kind === "product" ? "product" : "avatar"}
          refs={refs}
          onAdd={onAdd}
          onRemove={onRemove}
        />
      ) : null}
    </div>
  );
}
