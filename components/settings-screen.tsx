"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CodeSelect, LocaleChecks, TimezoneField, useCatalog } from "@/components/catalog-fields";
import { useAccount } from "@/components/use-account";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAutoSave } from "@/hooks/use-auto-save";
import { ApiError, api, type Organization } from "@/lib/api";

type SettingsDraft = {
  name: string;
  country: string;
  default_locale: string;
  supported_locales: string[];
  currency: string;
  timezone: string;
};

export function SettingsScreen() {
  const t = useTranslations("nav");

  return (
    <AppShell title={t("organization")}>
      <SettingsBody />
    </AppShell>
  );
}

function SettingsBody() {
  const errors = useTranslations("errors");
  const { organization, loading } = useAccount();

  if (loading || !organization) {
    return null;
  }
  if (organization.role !== "owner") {
    return <p className="text-sm text-ink/70">{errors("forbidden")}</p>;
  }

  return <SettingsForm organization={organization} />;
}

function SettingsForm({ organization }: { organization: Organization }) {
  const t = useTranslations("settings");
  const nav = useTranslations("nav");
  const org = useTranslations("organization");
  const errors = useTranslations("errors");
  const queryClient = useQueryClient();
  const catalog = useCatalog();
  const [draft, setDraft] = useState<SettingsDraft>({
    name: organization.name,
    country: organization.country,
    default_locale: organization.default_locale,
    supported_locales: organization.supported_locales,
    currency: organization.currency,
    timezone: organization.timezone,
  });
  const [dirty, setDirty] = useState(false);

  const { touch } = useAutoSave({
    payload: draft,
    dirty,
    enabled: draft.name.trim().length > 0,
    toastId: `org-settings-${organization.id}`,
    successMessage: t("saved"),
    errorMessage: (error) => {
      const code = error instanceof ApiError ? error.code : "internal_error";
      const known = ["invalid_input", "forbidden", "not_found", "internal_error"] as const;
      return errors(known.includes(code as (typeof known)[number]) ? (code as (typeof known)[number]) : "internal_error");
    },
    save: (payload) =>
      api(`/v1/organizations/${organization.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_result, meta) => {
      if (meta.isCurrent) {
        setDirty(false);
      }
      void queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });

  function update(next: Partial<SettingsDraft>) {
    touch();
    setDirty(true);
    setDraft((current) => ({ ...current, ...next }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{nav("organization")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <Field id="settings-name" label={org("name")} value={draft.name} onChange={(name) => update({ name })} />
          {catalog.data ? (
            <>
              <CodeSelect
                id="settings-country"
                label={org("country")}
                kind="country"
                value={draft.country}
                options={catalog.data.countries}
                onChange={(country) => update({ country })}
              />
              <CodeSelect
                id="settings-locale"
                label={org("locale")}
                kind="locale"
                value={draft.default_locale}
                options={catalog.data.locales}
                onChange={(next) => {
                  update({
                    default_locale: next,
                    supported_locales: draft.supported_locales.includes(next)
                      ? draft.supported_locales
                      : [...draft.supported_locales, next],
                  });
                }}
              />
              <LocaleChecks
                legend={t("supportedLocales")}
                options={catalog.data.locales}
                selected={draft.supported_locales}
                locked={draft.default_locale}
                onChange={(supported_locales) => update({ supported_locales })}
              />
              <p className="text-sm text-ink/70">{t("supportedHint")}</p>
              <CodeSelect
                id="settings-currency"
                label={org("currency")}
                kind="currency"
                value={draft.currency}
                options={catalog.data.currencies}
                onChange={(currency) => update({ currency })}
              />
              <TimezoneField
                id="settings-timezone"
                label={org("timezone")}
                value={draft.timezone}
                options={catalog.data.timezones}
                onChange={(timezone) => update({ timezone })}
              />
            </>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} required />
    </div>
  );
}
