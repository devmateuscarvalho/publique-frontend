"use client";

import { ArrowLeft, Globe, Loader2, Type } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WizardNewBrandPath = "scan" | "manual";

function displayWebsite(raw: string): string {
  return raw.trim().replace(/^https?:\/\//i, "");
}

function previewHost(raw: string): string {
  const value = displayWebsite(raw);
  if (!value || !value.includes(".")) {
    return "";
  }
  try {
    return new URL(`https://${value}`).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function looksLikeName(raw: string): boolean {
  const value = displayWebsite(raw);
  return value.length > 1 && /\s/.test(value) && !value.includes(".");
}

export function WizardNewBrand({
  path,
  onPathChange,
  website,
  onWebsiteChange,
  brandName,
  onBrandNameChange,
  pending,
  canScan,
  canCreateManual,
  onScan,
  onCreateManual,
}: {
  path: WizardNewBrandPath;
  onPathChange: (path: WizardNewBrandPath) => void;
  website: string;
  onWebsiteChange: (value: string) => void;
  brandName: string;
  onBrandNameChange: (value: string) => void;
  pending: boolean;
  canScan: boolean;
  canCreateManual: boolean;
  onScan: () => void;
  onCreateManual: () => void;
}) {
  const t = useTranslations("wizard");
  const siteValue = displayWebsite(website);
  const host = previewHost(website);
  const nameHint = looksLikeName(website);

  return (
    <div className="overflow-hidden rounded-2xl border border-input bg-card shadow-sm">
      <div className="space-y-5 p-4 md:p-5">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-2xl",
              path === "scan" ? "bg-pine/10 text-pine" : "bg-muted text-ink/70",
            )}
          >
            {path === "scan" ? <Globe className="size-5" aria-hidden /> : <Type className="size-5" aria-hidden />}
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="text-base font-semibold">{path === "scan" ? t("newBrandScanTitle") : t("newBrandManualTitle")}</h3>
            <p className="text-sm text-ink/70">{path === "scan" ? t("newBrandScanLead") : t("newBrandManualLead")}</p>
          </div>
        </div>

        {path === "scan" ? (
          <div className="space-y-3">
            <label className="block space-y-2" htmlFor="wizard-site">
              <span className="sr-only">{t("newBrandScanTitle")}</span>
              <div className="flex min-h-12 items-center rounded-xl border border-input bg-muted px-3 focus-within:ring-1 focus-within:ring-ring">
                <span className="shrink-0 pr-1 text-sm text-ink/40">https://</span>
                <input
                  id="wizard-site"
                  className="min-h-12 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  value={siteValue}
                  onChange={(event) => onWebsiteChange(event.target.value)}
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={t("newBrandWebsiteHint")}
                  disabled={pending}
                />
              </div>
            </label>
            {host ? <p className="text-xs text-ink/60">{t("newBrandScanPreview", { host })}</p> : null}
            {nameHint ? (
              <button
                type="button"
                className="min-h-11 text-left text-sm text-pine underline-offset-2 hover:underline"
                onClick={() => {
                  onBrandNameChange(siteValue);
                  onPathChange("manual");
                }}
              >
                {t("newBrandLooksLikeName")}
              </button>
            ) : null}
            <Button type="button" className="min-h-11 w-full" disabled={!canScan || pending} onClick={onScan}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {t("scanSite")}
            </Button>
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-center text-sm text-ink/70 underline-offset-2 hover:underline"
              disabled={pending}
              onClick={() => onPathChange("manual")}
            >
              {t("newBrandNoSite")}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block space-y-2" htmlFor="wizard-brand-name">
              <span className="sr-only">{t("newBrandManualTitle")}</span>
              <input
                id="wizard-brand-name"
                className="flex min-h-12 w-full rounded-xl border border-input bg-muted px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={brandName}
                onChange={(event) => onBrandNameChange(event.target.value)}
                autoComplete="organization"
                placeholder={t("newBrandNameHint")}
                disabled={pending}
              />
            </label>
            <Button type="button" className="min-h-11 w-full" disabled={!canCreateManual || pending} onClick={onCreateManual}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {t("createManual")}
            </Button>
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-center gap-1.5 text-sm text-ink/70 underline-offset-2 hover:underline"
              disabled={pending}
              onClick={() => onPathChange("scan")}
            >
              <ArrowLeft className="size-4" aria-hidden />
              {t("newBrandPreferScan")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function WizardModeSwitch({
  hasExisting,
  mode,
  disabled,
  onExisting,
  onNew,
  existingLabel,
  newLabel,
}: {
  hasExisting: boolean;
  mode: "existing" | "new";
  disabled?: boolean;
  onExisting: () => void;
  onNew: () => void;
  existingLabel: string;
  newLabel: string;
}) {
  if (!hasExisting) {
    return null;
  }
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
      <button
        type="button"
        disabled={disabled}
        onClick={onExisting}
        className={cn(
          "min-h-11 rounded-xl px-3 text-sm font-medium transition",
          mode === "existing" ? "bg-background text-ink shadow-sm" : "text-ink/70",
        )}
      >
        {existingLabel}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onNew}
        className={cn(
          "min-h-11 rounded-xl px-3 text-sm font-medium transition",
          mode === "new" ? "bg-background text-ink shadow-sm" : "text-ink/70",
        )}
      >
        {newLabel}
      </button>
    </div>
  );
}
