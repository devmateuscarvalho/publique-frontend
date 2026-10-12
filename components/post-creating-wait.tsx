"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Iphone } from "@/components/ui/iphone";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const BEAT_KEYS = ["0", "1", "2", "3", "4", "5"] as const;

export function PostCreatingWait({ brandName }: { brandName: string }) {
  const t = useTranslations("creation");
  const brand = brandName.trim() || t("manualUntitled");
  const [beatIndex, setBeatIndex] = useState(0);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const started = Date.now();
    const beats = window.setInterval(() => {
      setBeatIndex((current) => (current + 1) % BEAT_KEYS.length);
    }, 3500);
    const bar = window.setInterval(() => {
      setProgress(Math.min(92, 8 + (Date.now() - started) / 700));
    }, 200);
    return () => {
      window.clearInterval(beats);
      window.clearInterval(bar);
    };
  }, []);

  return (
    <section aria-busy="true" aria-live="polite" aria-label={t("creatingNoticeTitle")}>
      <Iphone>
        <div className="flex size-full flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
          <div className="flex shrink-0 items-end justify-between px-5 pb-1.5 pt-3 text-[10px] font-semibold">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <span className="h-2 w-4 rounded-sm bg-neutral-900/80 dark:bg-neutral-100/80" />
              <span className="h-2.5 w-5 rounded-sm bg-neutral-900/80 dark:bg-neutral-100/80" />
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-4 py-2.5">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-2.5 w-28" />
              <Skeleton className="h-2 w-16" />
            </div>
          </div>

          <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-900">
            <Skeleton className="absolute inset-0 rounded-none" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/55 px-6 text-center backdrop-blur-sm dark:bg-neutral-950/55">
              <span className="relative grid size-12 place-items-center" aria-hidden>
                <span className="absolute inset-0 rounded-full border-2 border-pine/15" />
                <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-pine motion-reduce:animate-none" />
              </span>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold">{t("creatingNoticeTitle")}</p>
                <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {t(`manualGeneratingBeats.${BEAT_KEYS[beatIndex]}`, { brand })}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 px-4 py-4">
            <Skeleton className="h-2.5 w-[88%]" />
            <Skeleton className="h-2.5 w-[64%]" />
            <Skeleton className="h-2.5 w-[72%]" />
            <Progress value={progress} className="mt-3 h-1 bg-pine/15 [&>div]:bg-pine" />
            <p className="text-center text-[11px] text-neutral-400">{t("manualGeneratingFooter")}</p>
          </div>
        </div>
      </Iphone>
    </section>
  );
}
