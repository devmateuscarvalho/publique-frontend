"use client";

import { useQuery } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { SocialNetworkIcon, type SocialNetworkID } from "@/components/social-network-icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { wizardChoiceClass, wizardChoiceState, wizardFieldClass, wizardHintClass, wizardPanelClass, WizardStepHeader } from "@/components/wizard-ui";
import { api } from "@/lib/api";
import { startSocialOAuth } from "@/lib/social-connect";
import { cn } from "@/lib/utils";

const NETWORKS = ["linkedin", "instagram", "facebook", "tiktok"] as const;

export type WhenMode = "now" | "once" | "weekly";

export function WizardWhen({
  brandId,
  timezone,
  mode,
  onMode,
  publishOn,
  onPublishOn,
  publishTime,
  onPublishTime,
  weekday,
  onWeekday,
  startsOn,
  onStartsOn,
  endsOn,
  onEndsOn,
  networks,
  onNetworks,
  requireApproval,
  onRequireApproval,
}: {
  brandId: string;
  timezone: string;
  mode: WhenMode;
  onMode: (mode: WhenMode) => void;
  publishOn: string;
  onPublishOn: (value: string) => void;
  publishTime: string;
  onPublishTime: (value: string) => void;
  weekday: string;
  onWeekday: (value: string) => void;
  startsOn: string;
  onStartsOn: (value: string) => void;
  endsOn: string;
  onEndsOn: (value: string) => void;
  networks: string[];
  onNetworks: (value: string[]) => void;
  requireApproval: boolean;
  onRequireApproval: (value: boolean) => void;
}) {
  const t = useTranslations("wizard");
  const creation = useTranslations("creation");
  const integrationsQuery = useQuery({
    queryKey: ["integrations", brandId],
    queryFn: () =>
      api<{ integrations: { network: string; configured: boolean; page_urn?: string }[] }>(
        `/v1/brands/${brandId}/integrations`,
      ),
    enabled: Boolean(brandId),
  });
  const connected = (integrationsQuery.data?.integrations ?? [])
    .filter((item) => item.configured && (item.network === "instagram" || item.network === "tiktok" || item.page_urn))
    .map((item) => item.network);

  const toggleNetwork = (id: string) => {
    onNetworks(networks.includes(id) ? networks.filter((item) => item !== id) : [...networks, id]);
  };

  return (
    <div className="space-y-5">
      <WizardStepHeader title={t("whenTitle")} lead={t("whenLead", { zone: timezone || "UTC" })} />
      <div className="grid grid-cols-3 gap-2">
        {(["now", "once", "weekly"] as const).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={mode === item}
            className={cn(wizardChoiceClass, wizardChoiceState(mode === item))}
            onClick={() => onMode(item)}
          >
            {t(item === "now" ? "whenNow" : item === "once" ? "whenOnce" : "whenWeekly")}
          </button>
        ))}
      </div>

      {mode === "once" ? (
        <div className={cn(wizardPanelClass, "grid gap-4 p-4 sm:grid-cols-2 sm:p-5")}>
          <Field label={t("whenDate")}>
            <input className={wizardFieldClass} type="date" value={publishOn} onChange={(event) => onPublishOn(event.target.value)} />
          </Field>
          <Field label={t("whenTime")}>
            <input className={wizardFieldClass} type="time" value={publishTime} onChange={(event) => onPublishTime(event.target.value)} />
          </Field>
        </div>
      ) : null}

      {mode === "weekly" ? (
        <div className={cn(wizardPanelClass, "grid gap-4 p-4 sm:grid-cols-2 sm:p-5")}>
          <Field label={t("whenWeekday")}>
            <select className={wizardFieldClass} value={weekday} onChange={(event) => onWeekday(event.target.value)}>
              {([1, 2, 3, 4, 5, 6, 7] as const).map((day) => (
                <option key={day} value={String(day)}>
                  {creation(`weekdays.${day}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("whenTime")}>
            <input className={wizardFieldClass} type="time" value={publishTime} onChange={(event) => onPublishTime(event.target.value)} />
          </Field>
          <Field label={t("whenStart")}>
            <input className={wizardFieldClass} type="date" value={startsOn} onChange={(event) => onStartsOn(event.target.value)} />
          </Field>
          <Field label={`${t("whenEnd")} (${t("whenEndOptional")})`}>
            <input className={wizardFieldClass} type="date" value={endsOn} onChange={(event) => onEndsOn(event.target.value)} />
          </Field>
        </div>
      ) : null}

      {mode !== "now" ? (
        <div className={cn(wizardPanelClass, "space-y-3 p-4 sm:p-5")}>
          <div className="space-y-1">
            <Label>{t("whenNetworks")}</Label>
            {connected.length === 0 && !integrationsQuery.isLoading ? (
              <p className={wizardHintClass}>{t("whenNoNetworks")}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {NETWORKS.map((id) => {
              const ready = connected.includes(id);
              const selected = networks.includes(id);
              if (!ready) {
                return (
                  <Button
                    key={id}
                    type="button"
                    variant="outline"
                    className="min-h-11 gap-2 rounded-md shadow-none"
                    onClick={() => {
                      void startSocialOAuth(brandId, id, window.location.pathname + window.location.search).then(() =>
                        integrationsQuery.refetch(),
                      );
                    }}
                  >
                    <SocialNetworkIcon id={id as SocialNetworkID} className="size-4" />
                    {creation(`manualPublishNetworks.${id}`)}
                  </Button>
                );
              }
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    selected ? "border-pine bg-pine text-white" : "border-border bg-background text-ink hover:border-pine/35",
                  )}
                  onClick={() => toggleNetwork(id)}
                >
                  <SocialNetworkIcon id={id as SocialNetworkID} className="size-4" />
                  {creation(`manualPublishNetworks.${id}`)}
                </button>
              );
            })}
          </div>
          <label className="flex min-h-11 items-center gap-3 border-t border-border pt-3 text-sm">
            <input
              type="checkbox"
              className="size-4 shrink-0 accent-pine"
              checked={requireApproval}
              onChange={(event) => onRequireApproval(event.target.checked)}
            />
            {t("whenApproval")}
          </label>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
