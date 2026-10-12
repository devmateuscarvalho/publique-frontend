"use client";

import { useTranslations } from "next-intl";

import { WizardRefs, type WizardLocalRef } from "@/components/wizard-refs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CreativeRecipe } from "@/lib/api";

export type WizardProduct = {
  name: string;
  price: string;
  description: string;
};

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

export function WizardPrepare({
  recipe,
  includeLogo,
  onIncludeLogo,
  refs,
  onAdd,
  onRemove,
  product,
  onProduct,
}: {
  recipe?: CreativeRecipe | null;
  includeLogo: boolean;
  onIncludeLogo: (value: boolean) => void;
  refs: WizardLocalRef[];
  onAdd: (role: "person" | "location", file: File) => void;
  onRemove: (key: string) => void;
  product: WizardProduct;
  onProduct: (next: WizardProduct) => void;
}) {
  const t = useTranslations("wizard");
  const kind = wizardScreenKind(recipe);
  const showLogo = kind !== "carousel";
  const showRefs = kind === "product" || kind === "avatar";

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold md:text-xl">{t(`prepareTitle.${kind}`)}</h2>
        <p className="text-sm text-ink/70">{t(`prepareLead.${kind}`)}</p>
      </div>

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

      {showRefs ? (
        <WizardRefs
          outputKind={kind === "product" ? "product" : "avatar"}
          includeLogo={includeLogo}
          onIncludeLogo={onIncludeLogo}
          refs={refs}
          onAdd={onAdd}
          onRemove={onRemove}
          showLogo={showLogo}
        />
      ) : showLogo ? (
        <label className="flex min-h-11 items-start gap-3 rounded-2xl border border-input bg-card px-3 py-3 text-sm shadow-sm">
          <input
            type="checkbox"
            className="mt-1 size-4 rounded border-input"
            checked={includeLogo}
            onChange={(event) => onIncludeLogo(event.target.checked)}
          />
          <span>
            <span className="block font-medium">{t("includeLogo")}</span>
            <span className="mt-0.5 block text-ink/70">{t("prepareLogoHint")}</span>
          </span>
        </label>
      ) : null}
    </div>
  );
}
