"use client";

import { useQueries } from "@tanstack/react-query";
import { Check, Pencil, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { WizardBrandMark, visualLogoUrl } from "@/components/wizard-brand-mark";
import { WizardActions, wizardFieldClass, wizardFocusClass, wizardPrimaryClass, wizardSurfaceState } from "@/components/wizard-ui";
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
    <div className="flex min-h-0 flex-col gap-3">
      {brands.length > 5 ? (
        <label className="relative block" htmlFor="wizard-brand-search">
          <span className="sr-only">{t("brandSearch")}</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            id="wizard-brand-search"
            className={cn(wizardFieldClass, "bg-card pl-9")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("brandSearch")}
            autoComplete="off"
          />
        </label>
      ) : null}
      <ul
        className={cn(
          "grid max-h-[max(11rem,min(34rem,calc(100svh-29rem)))] grid-cols-1 gap-2 overflow-y-auto overscroll-contain p-px",
          filtered.length > 1 && "sm:grid-cols-2 sm:gap-3",
        )}
        role="listbox"
        aria-label={t("siteTitle")}
      >
        {filtered.map((brand) => {
          const selected = brand.id === selectedId;
          const host = hostOf(brand.website_url);
          const segment = brand.segment_id ? segmentLabel(brand.segment_id) : "";
          return (
            <li key={brand.id} className="min-w-0">
              <div
                className={cn(
                  "flex h-full min-h-[4.5rem] items-center gap-0.5 rounded-lg border py-1.5 pr-1.5 pl-2",
                  wizardSurfaceState(selected),
                )}
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    "flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-1 text-left",
                    wizardFocusClass,
                  )}
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
                    <span className="block truncate text-sm leading-tight font-medium">{brand.name}</span>
                    {segment ? <span className="mt-1 block truncate text-xs text-ink/70">{segment}</span> : null}
                    {host ? (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground" title={host}>
                        {host}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-200 motion-reduce:transition-none",
                      selected ? "border-pine bg-pine text-white" : "border-border bg-card text-transparent",
                    )}
                    aria-hidden
                  >
                    <Check className="size-3" strokeWidth={2.75} />
                  </span>
                </button>
                {selected ? (
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0 text-muted-foreground hover:bg-background hover:text-ink"
                  >
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
          <li className="px-3 py-10 text-center text-sm text-ink/55 sm:col-span-2">{t("brandSearchEmpty")}</li>
        ) : null}
      </ul>
      <WizardActions>
        <Button
          type="button"
          className={wizardPrimaryClass}
          disabled={!canContinue}
          onClick={onContinue}
        >
          {continueLabel}
        </Button>
      </WizardActions>
    </div>
  );
}
