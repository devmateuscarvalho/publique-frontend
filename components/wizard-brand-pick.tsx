"use client";

import { useQueries } from "@tanstack/react-query";
import { Check, Pencil } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { WizardBrandMark, visualLogoUrl } from "@/components/wizard-brand-mark";
import { Button } from "@/components/ui/button";
import { api, type Brand, type VisualResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

function hostOf(raw?: string) {
  if (!raw) {
    return "";
  }
  try {
    const value = raw.includes("://") ? raw : `https://${raw}`;
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function WizardBrandPick({
  brands,
  selectedId,
  onSelect,
  segmentLabel,
  editLabel,
  continueLabel,
  onContinue,
  canContinue,
}: {
  brands: Brand[];
  selectedId: string;
  onSelect: (brand: Brand) => void;
  segmentLabel: (id: string) => string;
  editLabel: string;
  continueLabel: string;
  onContinue: () => void;
  canContinue: boolean;
}) {
  const t = useTranslations("wizard");
  const [query, setQuery] = useState("");
  const visuals = useQueries({
    queries: brands.map((brand) => ({
      queryKey: ["visual", brand.id] as const,
      queryFn: () => api<VisualResponse>(`/v1/brands/${brand.id}/visual`),
      enabled: Boolean(brand.id),
      staleTime: 5 * 60_000,
    })),
  });
  const logoOf = (id: string) => {
    const index = brands.findIndex((brand) => brand.id === id);
    return visualLogoUrl(index >= 0 ? visuals[index]?.data?.identity : undefined);
  };
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return brands;
    }
    return brands.filter((brand) => {
      const host = hostOf(brand.website_url);
      return brand.name.toLowerCase().includes(needle) || host.toLowerCase().includes(needle);
    });
  }, [brands, query]);

  return (
    <div className="space-y-3 rounded-2xl border border-input bg-card p-3 shadow-sm md:p-4">
      {brands.length > 5 ? (
        <label className="block" htmlFor="wizard-brand-search">
          <span className="sr-only">{t("brandSearch")}</span>
          <input
            id="wizard-brand-search"
            className="flex min-h-11 w-full rounded-xl border border-input bg-muted px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("brandSearch")}
            autoComplete="off"
          />
        </label>
      ) : null}
      <ul className="max-h-[min(22rem,50svh)] space-y-2 overflow-y-auto" role="listbox" aria-label={t("siteTitle")}>
        {filtered.map((brand) => {
          const selected = brand.id === selectedId;
          const host = hostOf(brand.website_url);
          return (
            <li key={brand.id}>
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-2xl border px-1.5 py-1.5 transition",
                  selected ? "border-pine/35 bg-pine/5 shadow-sm" : "border-transparent hover:bg-muted/60",
                )}
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-1.5 text-left"
                  onClick={() => onSelect(brand)}
                  onDoubleClick={() => {
                    onSelect(brand);
                    if (brand.segment_id) {
                      onContinue();
                    }
                  }}
                >
                  <WizardBrandMark name={brand.name} logoUrl={logoOf(brand.id)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{brand.name}</span>
                    <span className="block truncate text-xs text-ink/55">
                      {[brand.segment_id ? segmentLabel(brand.segment_id) : null, host].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border",
                      selected ? "border-pine bg-pine text-white" : "border-input text-transparent",
                    )}
                    aria-hidden
                  >
                    <Check className="size-3" />
                  </span>
                </button>
                {selected ? (
                  <Button asChild variant="outline" size="icon" className="min-h-11 min-w-11 shrink-0">
                    <Link href={`/brands/${brand.id}`} aria-label={editLabel}>
                      <Pencil />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
        {filtered.length === 0 ? (
          <li className="px-2 py-6 text-center text-sm text-ink/55">{t("brandSearchEmpty")}</li>
        ) : null}
      </ul>
      <div className="flex justify-end">
        <Button type="button" className="min-h-11 min-w-28" disabled={!canContinue} onClick={onContinue}>
          {continueLabel}
        </Button>
      </div>
    </div>
  );
}
