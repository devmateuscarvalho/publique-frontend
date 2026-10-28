"use client";

import { ArrowLeft, Globe, Loader2, Type } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { wizardFieldClass, wizardPanelClass } from "@/components/wizard-ui";
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
    <div className={cn(wizardPanelClass, "p-4 md:p-6")}>
      <div className="flex items-start gap-3.5">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-md",
            path === "scan" ? "bg-pine/10 text-pine" : "bg-muted text-ink/70",
          )}
        >
          {path === "scan" ? <Globe className="size-5" aria-hidden /> : <Type className="size-5" aria-hidden />}
        </div>
        <div className="min-w-0 space-y-1">
          <h3 className="font-display text-lg leading-tight font-semibold tracking-tight">
            {path === "scan" ? t("newBrandScanTitle") : t("newBrandManualTitle")}
          </h3>
          <p className="max-w-2xl text-sm leading-relaxed text-ink/65">
            {path === "scan" ? t("newBrandScanLead") : t("newBrandManualLead")}
          </p>
        </div>
      </div>

      {path === "scan" ? (
        <div className="mt-5 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="block min-w-0 flex-1" htmlFor="wizard-site">
              <span className="sr-only">{t("newBrandScanTitle")}</span>
              <div className="flex h-11 items-center rounded-md border border-border bg-background px-3 transition-colors duration-200 focus-within:border-pine/70 focus-within:ring-2 focus-within:ring-pine/25 motion-reduce:transition-none">
                <span className="shrink-0 pr-1 text-base text-ink/40">https://</span>
                <input
                  id="wizard-site"
                  className="h-11 w-full min-w-0 bg-transparent text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
            <Button type="button" className="min-h-11 w-full shrink-0 sm:w-auto sm:min-w-36" disabled={!canScan || pending} onClick={onScan}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {t("scanSite")}
            </Button>
          </div>
          {host ? <p className="text-xs text-ink/55">{t("newBrandScanPreview", { host })}</p> : null}
          {nameHint ? (
            <button
              type="button"
              className="min-h-11 text-left text-sm text-pine underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/40"
              onClick={() => {
                onBrandNameChange(siteValue);
                onPathChange("manual");
              }}
            >
              {t("newBrandLooksLikeName")}
            </button>
          ) : null}
          <button
            type="button"
            className="flex min-h-11 items-center text-sm text-ink/60 underline-offset-2 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 disabled:opacity-50"
            disabled={pending}
            onClick={() => onPathChange("manual")}
          >
            {t("newBrandNoSite")}
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="block min-w-0 flex-1" htmlFor="wizard-brand-name">
              <span className="sr-only">{t("newBrandManualTitle")}</span>
              <input
                id="wizard-brand-name"
                className={wizardFieldClass}
                value={brandName}
                onChange={(event) => onBrandNameChange(event.target.value)}
                autoComplete="organization"
                placeholder={t("newBrandNameHint")}
                disabled={pending}
              />
            </label>
            <Button
              type="button"
              className="min-h-11 w-full shrink-0 sm:w-auto sm:min-w-36"
              disabled={!canCreateManual || pending}
              onClick={onCreateManual}
            >
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {t("createManual")}
            </Button>
          </div>
          <button
            type="button"
            className="flex min-h-11 items-center gap-1.5 text-sm text-ink/60 underline-offset-2 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 disabled:opacity-50"
            disabled={pending}
            onClick={() => onPathChange("scan")}
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t("newBrandPreferScan")}
          </button>
        </div>
      )}
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
    <div className="grid w-full grid-cols-2 gap-1 rounded-lg border border-border bg-muted/70 p-1 sm:max-w-md">
      <button
        type="button"
        aria-pressed={mode === "existing"}
        disabled={disabled}
        onClick={onExisting}
        className={cn(
          "min-h-11 rounded-md px-3 text-sm font-medium transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/40",
          "disabled:opacity-50 motion-reduce:transition-none",
          mode === "existing" ? "bg-card text-ink shadow-[inset_0_0_0_1px_var(--border)]" : "text-ink/60 hover:text-ink",
        )}
      >
        {existingLabel}
      </button>
      <button
        type="button"
        aria-pressed={mode === "new"}
        disabled={disabled}
        onClick={onNew}
        className={cn(
          "min-h-11 rounded-md px-3 text-sm font-medium transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/40",
          "disabled:opacity-50 motion-reduce:transition-none",
          mode === "new" ? "bg-card text-ink shadow-[inset_0_0_0_1px_var(--border)]" : "text-ink/60 hover:text-ink",
        )}
      >
        {newLabel}
      </button>
    </div>
  );
}
