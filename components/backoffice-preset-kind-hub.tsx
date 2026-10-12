"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { AppShell } from "@/components/app-shell";
import { WizardKindPick } from "@/components/wizard-kind-pick";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/components/use-account";
import { api, type OutputKind } from "@/lib/api";

export function BackofficePresetKindHub() {
  const t = useTranslations("backoffice");
  const router = useRouter();
  const { me, loading } = useAccount();
  const isSuperAdmin = me.data?.user.platform_role === "super_admin";

  const kindsQuery = useQuery({
    queryKey: ["output-kinds", "catalog"],
    queryFn: () => api<{ output_kinds: OutputKind[] }>("/v1/output-kinds?published=false"),
    enabled: isSuperAdmin,
  });

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
          <h2 className="text-lg font-semibold md:text-xl">{t("newKindTitle")}</h2>
          <p className="text-sm text-ink/70">{t("newKindLead")}</p>
        </div>
        <WizardKindPick
          kinds={kindsQuery.data?.output_kinds ?? []}
          loading={kindsQuery.isLoading}
          empty={t("newKindEmpty")}
          onPick={(kind) => router.push(`/backoffice/presets/new/${kind.code}`)}
        />
      </div>
    </AppShell>
  );
}
