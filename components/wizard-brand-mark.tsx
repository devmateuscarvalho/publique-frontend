"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function WizardBrandMark({
  name,
  logoUrl,
  size = "md",
}: {
  name: string;
  logoUrl?: string;
  size?: "sm" | "md";
}) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "?";
  return (
    <Avatar className={cn("rounded-md border border-border bg-card", size === "sm" ? "size-8" : "size-10")}>
      {logoUrl ? <AvatarImage src={logoUrl} alt="" className="object-contain p-1" /> : null}
      <AvatarFallback
        className={cn(
          "rounded-md bg-wizard-icon font-semibold text-pine",
          size === "sm" ? "text-xs" : "text-sm",
        )}
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}

export function visualLogoUrl(identity?: {
  logo_url?: string;
  logo_inverted_url?: string;
  icon_url?: string;
}) {
  return identity?.logo_url || identity?.logo_inverted_url || identity?.icon_url || undefined;
}
