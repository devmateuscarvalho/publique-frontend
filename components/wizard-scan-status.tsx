"use client";

import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

function displayWebsite(raw: string): string {
  return raw.trim().replace(/^https?:\/\//i, "");
}

export function WizardScanStatus({
  state,
  host,
  brandName,
  segment,
  brandHref,
  website,
  onWebsiteChange,
  canContinue,
  onContinue,
  onRetry,
}: {
  state: "busy" | "ready" | "failed";
  host: string;
  brandName: string;
  segment?: string;
  brandHref: string;
  website?: string;
  onWebsiteChange?: (value: string) => void;
  canContinue: boolean;
  onContinue: () => void;
  onRetry: () => void;
}) {
  const t = useTranslations("wizard");
  const [busyValue, setBusyValue] = useState(10);

  useEffect(() => {
    if (state !== "busy") {
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => {
      setBusyValue(Math.min(92, 10 + (Date.now() - started) / 450));
    }, 200);
    return () => window.clearInterval(timer);
  }, [state]);

  const value = state === "ready" ? 100 : busyValue;

  return (
    <div className="space-y-4 rounded-2xl border border-input bg-card p-4 shadow-sm md:p-5">
      <div className="flex items-start gap-3">
        <div
          className={
            state === "ready"
              ? "grid size-11 shrink-0 place-items-center rounded-2xl bg-pine/10 text-pine"
              : state === "failed"
                ? "grid size-11 shrink-0 place-items-center rounded-2xl bg-destructive/10 text-destructive"
                : "grid size-11 shrink-0 place-items-center rounded-2xl bg-muted text-ink/70"
          }
        >
          {state === "busy" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
          {state === "ready" ? <Check className="size-5" aria-hidden /> : null}
          {state === "failed" ? <span className="text-lg font-semibold">!</span> : null}
        </div>
        <div className="min-w-0 space-y-1">
          <h3 className="text-base font-semibold">
            {state === "busy" ? t("scanProgressTitle", { host }) : null}
            {state === "ready" ? t("scanReadyTitle") : null}
            {state === "failed" ? t("scanFailed") : null}
          </h3>
          <p className="text-sm text-ink/70">
            {state === "busy" ? t("scanProgressLead") : null}
            {state === "ready" ? t("scanReadyLead") : null}
            {state === "failed" ? t("scanRetryLead") : null}
          </p>
          {brandName ? (
            <p className="pt-1 text-sm">
              <span className="font-medium">{brandName}</span>
              {segment ? <span className="text-ink/55"> · {segment}</span> : null}
            </p>
          ) : null}
        </div>
      </div>

      {state === "busy" ? (
        <Progress value={value} className="h-2 bg-pine/15 [&>div]:bg-pine" />
      ) : null}

      {state === "failed" && onWebsiteChange ? (
        <label className="block" htmlFor="wizard-scan-retry-url">
          <span className="sr-only">{t("newBrandWebsiteHint")}</span>
          <div className="flex min-h-12 items-center rounded-xl border border-input bg-muted px-3 focus-within:ring-1 focus-within:ring-ring">
            <span className="shrink-0 pr-1 text-sm text-ink/40">https://</span>
            <input
              id="wizard-scan-retry-url"
              className="min-h-12 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
              value={displayWebsite(website ?? "")}
              onChange={(event) => onWebsiteChange(event.target.value)}
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={t("newBrandWebsiteHint")}
            />
          </div>
        </label>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" className="min-h-11 px-3">
          <Link href={brandHref}>{t("editBrand")}</Link>
        </Button>
        {state === "failed" ? (
          <Button
            type="button"
            className="min-h-11 min-w-28"
            disabled={!displayWebsite(website ?? "")}
            onClick={onRetry}
          >
            {t("scanRetry")}
          </Button>
        ) : (
          <Button type="button" className="min-h-11 min-w-28" disabled={!canContinue || state === "busy"} onClick={onContinue}>
            {t("next")}
          </Button>
        )}
      </div>
    </div>
  );
}
