"use client";

import { Clapperboard, GalleryHorizontal, ImageIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/components/use-account";
import { presetLabNewPath, type ContentFormat } from "@/lib/content-format";
import { cn } from "@/lib/utils";

const FORMATS = [
  { code: "image", icon: ImageIcon, ready: true },
  { code: "carousel", icon: GalleryHorizontal, ready: true },
  { code: "video", icon: Clapperboard, ready: false },
] as const;

export function BackofficePresetFormatHub() {
  const t = useTranslations("backoffice");
  const router = useRouter();
  const { me, loading } = useAccount();
  const isSuperAdmin = me.data?.user.platform_role === "super_admin";

  if (loading || me.isLoading) {
    return null;
  }

  if (!isSuperAdmin) {
    return (
      <AppShell title={t("title")}>
        <p className="text-sm text-ink/70">{t("forbidden")}</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={t("new")}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <Button asChild variant="outline" className="min-h-11 w-fit">
          <Link href="/backoffice/presets">{t("backToList")}</Link>
        </Button>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold md:text-xl">{t("newFormatTitle")}</h2>
          <p className="text-sm text-ink/70">{t("newFormatLead")}</p>
        </div>
        <ul className="space-y-2">
          {FORMATS.map((format) => {
            const Icon = format.icon;
            return (
              <li key={format.code}>
                <button
                  type="button"
                  disabled={!format.ready}
                  className={cn(
                    "flex min-h-16 w-full items-center gap-3 rounded-2xl border border-input bg-card px-3 py-3 text-left shadow-sm",
                    format.ready
                      ? "transition hover:border-pine/35 hover:bg-pine/5"
                      : "cursor-not-allowed opacity-55",
                  )}
                  onClick={() => {
                    if (format.ready) {
                      router.push(presetLabNewPath(format.code as ContentFormat));
                    }
                  }}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-ink">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{t(`formats.${format.code}.title`)}</span>
                    <span className="mt-0.5 block text-xs text-ink/60">
                      {format.ready ? t(`formats.${format.code}.lead`) : t("formats.video.soon")}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </AppShell>
  );
}
