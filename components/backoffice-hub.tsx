"use client";

import { CircleDollarSign, LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { AppShell } from "@/components/app-shell";
import { useAccount } from "@/components/use-account";

const items = [
  {
    href: "/backoffice/presets",
    titleKey: "presets" as const,
    leadKey: "presetsLead" as const,
    icon: LayoutTemplate,
  },
  {
    href: "/backoffice/costs",
    titleKey: "aiCosts" as const,
    leadKey: "aiCostsLead" as const,
    icon: CircleDollarSign,
  },
];

export function BackofficeHub() {
  const t = useTranslations("backoffice");
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
    <AppShell title={t("title")}>
      <div className="mx-auto w-full max-w-xl space-y-4">
        <p className="text-sm text-ink/70">{t("hubLead")}</p>
        <ul className="space-y-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-11 items-start gap-3 rounded-xl border border-input bg-card p-4"
                >
                  <Icon className="mt-0.5 size-5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-base font-medium">{t(item.titleKey)}</span>
                    <span className="mt-1 block text-sm text-ink/70">{t(item.leadKey)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </AppShell>
  );
}
