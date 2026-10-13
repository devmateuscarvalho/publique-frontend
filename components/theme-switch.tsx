"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import {
  resolveTheme,
  setResolvedTheme,
  subscribeTheme,
  type ResolvedTheme,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

function resolvedSnapshot(): ResolvedTheme {
  return resolveTheme();
}

/** One-click light ↔ dark. Device scheme is only the initial default, not a menu option. */
export function ThemeSwitch({ className }: { menu?: boolean; className?: string }) {
  const t = useTranslations("theme");
  const resolved = useSyncExternalStore(subscribeTheme, resolvedSnapshot, () => "light" as ResolvedTheme);

  return (
    <AnimatedThemeToggler
      theme={resolved}
      onThemeChange={setResolvedTheme}
      aria-label={t("label")}
      title={t(resolved)}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-md text-current transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
    />
  );
}
