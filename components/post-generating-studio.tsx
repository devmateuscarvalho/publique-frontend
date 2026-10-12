"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const BEAT_KEYS = ["0", "1", "2", "3", "4", "5"] as const;
const STAGE_KEYS = ["listen", "voice", "image", "polish"] as const;
const BEAT_MS = 3500;

function stageIndexFromElapsed(elapsedMs: number) {
  if (elapsedMs < 8000) return 0;
  if (elapsedMs < 20000) return 1;
  if (elapsedMs < 40000) return 2;
  return 3;
}

function brandLabel(name: string, fallback: string) {
  const trimmed = name.trim();
  return trimmed || fallback;
}

export function PostGeneratingStudio({
  brandName,
  templateName,
  compact = false,
}: {
  brandName: string;
  templateName?: string;
  compact?: boolean;
}) {
  const t = useTranslations("creation");
  const brand = brandLabel(brandName, t("manualUntitled"));
  const [beatIndex, setBeatIndex] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const started = Date.now();
    let fadeTimer: number | undefined;
    const beatTimer = window.setInterval(() => {
      setFade(false);
      window.clearTimeout(fadeTimer);
      fadeTimer = window.setTimeout(() => {
        setBeatIndex((current) => (current + 1) % BEAT_KEYS.length);
        setFade(true);
      }, 180);
    }, BEAT_MS);
    const stageTimer = window.setInterval(() => {
      setStageIndex(stageIndexFromElapsed(Date.now() - started));
    }, 1000);
    return () => {
      window.clearInterval(beatTimer);
      window.clearInterval(stageTimer);
      window.clearTimeout(fadeTimer);
    };
  }, []);

  const beat = t(`manualGeneratingBeats.${BEAT_KEYS[beatIndex]}`, { brand });

  if (compact) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-3 px-5 text-center">
        <span
          className="size-2.5 animate-pulse rounded-full bg-foreground/70"
          aria-hidden
        />
        <p
          key={beatIndex}
          className={cn(
            "max-w-[16rem] text-xs leading-relaxed text-ink/70 transition-opacity duration-200",
            fade ? "opacity-100" : "opacity-0",
          )}
          aria-live="polite"
        >
          {beat}
        </p>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="relative space-y-6 px-5 py-8 sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,0,0,0.04),_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.05),_transparent_55%)]"
          aria-hidden
        />
        <div className="relative space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.14em] text-ink/45">{t("manualGeneratingEyebrow")}</p>
          <h2 className="text-balance text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            {t("manualGeneratingTitle", { brand })}
          </h2>
          {templateName ? (
            <p className="text-sm text-ink/55">{t("manualGeneratingTemplate", { template: templateName })}</p>
          ) : null}
        </div>

        <div className="relative mx-auto flex min-h-[4.5rem] max-w-md items-center justify-center">
          <p
            key={beatIndex}
            className={cn(
              "text-balance text-center text-base leading-relaxed text-ink/80 transition-opacity duration-200 sm:text-lg",
              fade ? "opacity-100" : "opacity-0",
            )}
            aria-live="polite"
          >
            {beat}
          </p>
        </div>

        <ol className="relative mx-auto grid max-w-lg grid-cols-2 gap-2 sm:grid-cols-4">
          {STAGE_KEYS.map((key, index) => {
            const active = index === stageIndex;
            const done = index < stageIndex;
            return (
              <li
                key={key}
                className={cn(
                  "rounded-lg border px-2.5 py-2.5 text-center transition-colors duration-500",
                  active && "border-foreground/35 bg-foreground/[0.06]",
                  done && !active && "border-input bg-muted/40 text-ink/55",
                  !active && !done && "border-dashed border-input text-ink/40",
                )}
              >
                <span
                  className={cn(
                    "mb-1.5 mx-auto block size-1.5 rounded-full",
                    active && "animate-pulse bg-foreground",
                    done && !active && "bg-foreground/40",
                    !active && !done && "bg-ink/25",
                  )}
                  aria-hidden
                />
                <span className={cn("text-[11px] font-medium leading-snug", active && "text-ink")}>
                  {t(`manualGeneratingStages.${key}`)}
                </span>
              </li>
            );
          })}
        </ol>

        <p className="relative text-center text-xs text-ink/50">{t("manualGeneratingFooter")}</p>
      </CardContent>
    </Card>
  );
}

export function PostGeneratingCaptionLine({ brandName }: { brandName: string }) {
  const t = useTranslations("creation");
  const brand = brandLabel(brandName, t("manualUntitled"));
  const [beatIndex, setBeatIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBeatIndex((current) => (current + 1) % BEAT_KEYS.length);
    }, BEAT_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span aria-live="polite">{t(`manualGeneratingBeats.${BEAT_KEYS[beatIndex]}`, { brand })}</span>
  );
}
