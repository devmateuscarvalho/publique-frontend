"use client";

import { useQuery } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { SocialNetworkIcon, type SocialNetworkID } from "@/components/social-network-icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold md:text-xl">{t("whenTitle")}</h2>
        <p className="text-sm text-ink/70">{t("whenLead", { zone: timezone || "UTC" })}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["now", "once", "weekly"] as const).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={mode === item}
            className={cn(
              "min-h-11 rounded-xl border px-2 text-sm font-medium",
              mode === item ? "border-foreground bg-foreground text-background" : "border-input bg-background",
            )}
            onClick={() => onMode(item)}
          >
            {t(item === "now" ? "whenNow" : item === "once" ? "whenOnce" : "whenWeekly")}
          </button>
        ))}
      </div>

      {mode === "once" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("whenDate")}>
            <input className={fieldClass} type="date" value={publishOn} onChange={(event) => onPublishOn(event.target.value)} />
          </Field>
          <Field label={t("whenTime")}>
            <input className={fieldClass} type="time" value={publishTime} onChange={(event) => onPublishTime(event.target.value)} />
          </Field>
        </div>
      ) : null}

      {mode === "weekly" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("whenWeekday")}>
            <select className={fieldClass} value={weekday} onChange={(event) => onWeekday(event.target.value)}>
              {([1, 2, 3, 4, 5, 6, 7] as const).map((day) => (
                <option key={day} value={String(day)}>
                  {creation(`weekdays.${day}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("whenTime")}>
            <input className={fieldClass} type="time" value={publishTime} onChange={(event) => onPublishTime(event.target.value)} />
          </Field>
          <Field label={t("whenStart")}>
            <input className={fieldClass} type="date" value={startsOn} onChange={(event) => onStartsOn(event.target.value)} />
          </Field>
          <Field label={`${t("whenEnd")} (${t("whenEndOptional")})`}>
            <input className={fieldClass} type="date" value={endsOn} onChange={(event) => onEndsOn(event.target.value)} />
          </Field>
        </div>
      ) : null}

      {mode !== "now" ? (
        <div className="space-y-2">
          <Label>{t("whenNetworks")}</Label>
          {connected.length === 0 && !integrationsQuery.isLoading ? (
            <p className="text-sm text-ink/70">{t("whenNoNetworks")}</p>
          ) : null}
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
                    className="min-h-11 gap-2"
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
                    "inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium",
                    selected ? "border-foreground bg-foreground text-background" : "border-input bg-background",
                  )}
                  onClick={() => toggleNetwork(id)}
                >
                  <SocialNetworkIcon id={id as SocialNetworkID} className="size-4" />
                  {creation(`manualPublishNetworks.${id}`)}
                </button>
              );
            })}
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-5"
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

const fieldClass =
  "min-h-11 w-full rounded-xl border border-input bg-background px-3 text-base text-ink";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
