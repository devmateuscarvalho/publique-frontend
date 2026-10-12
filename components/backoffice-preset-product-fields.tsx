"use client";

import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function BackofficePresetProductFields({
  name,
  price,
  description,
  onName,
  onPrice,
  onDescription,
}: {
  name: string;
  price: string;
  description: string;
  onName: (value: string) => void;
  onPrice: (value: string) => void;
  onDescription: (value: string) => void;
}) {
  const t = useTranslations("backoffice");
  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      <div>
        <p className="text-sm font-medium">{t("labProduct")}</p>
        <p className="text-sm text-ink/70">{t("labProductHint")}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="lab-product-name">{t("labProductName")}</Label>
        <Input
          id="lab-product-name"
          className="min-h-11"
          value={name}
          onChange={(event) => onName(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lab-product-price">{t("labProductPrice")}</Label>
        <Input
          id="lab-product-price"
          className="min-h-11"
          value={price}
          onChange={(event) => onPrice(event.target.value)}
          placeholder={t("labProductPricePlaceholder")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lab-product-description">{t("labProductDescription")}</Label>
        <Textarea
          id="lab-product-description"
          className="min-h-24"
          value={description}
          onChange={(event) => onDescription(event.target.value)}
        />
      </div>
    </div>
  );
}
