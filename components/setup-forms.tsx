"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { CodeSelect, LocaleChecks, TimezoneField, useCatalog } from "@/components/catalog-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError, api, type Brand, type Organization, type Segment } from "@/lib/api";

export function OrganizationForm({
  onCreated,
  onError,
}: {
  onCreated: () => Promise<void>;
  onError: (code: string) => void;
}) {
  const t = useTranslations("organization");
  const settings = useTranslations("settings");
  const dashboard = useTranslations("dashboard");
  const catalog = useCatalog();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [locale, setLocale] = useState("");
  const [supported, setSupported] = useState<string[]>([]);
  const [currency, setCurrency] = useState("");
  const [timezone, setTimezone] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api("/v1/organizations", {
        method: "POST",
        body: JSON.stringify({
          name,
          country,
          default_locale: locale,
          supported_locales: supported,
          currency,
          timezone,
        }),
      }),
    onSuccess: onCreated,
    onError: (error) => onError(error instanceof ApiError ? error.code : "internal_error"),
  });

  if (!catalog.data) {
    return null;
  }

  const ready = Boolean(name && country && locale && supported.includes(locale) && currency && timezone);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dashboard("emptyOrg")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <TextField id="org-name" label={t("name")} value={name} onChange={setName} />
          <CodeSelect id="org-country" label={t("country")} kind="country" value={country} options={catalog.data.countries} onChange={setCountry} />
          <CodeSelect
            id="org-locale"
            label={t("locale")}
            kind="locale"
            value={locale}
            options={catalog.data.locales}
            onChange={(next) => {
              setLocale(next);
              setSupported((current) => (current.includes(next) ? current : [...current, next]));
            }}
          />
          <LocaleChecks
            legend={settings("supportedLocales")}
            options={catalog.data.locales}
            selected={supported}
            locked={locale}
            onChange={setSupported}
          />
          <p className="text-sm text-ink/70">{settings("supportedHint")}</p>
          <CodeSelect id="org-currency" label={t("currency")} kind="currency" value={currency} options={catalog.data.currencies} onChange={setCurrency} />
          <TimezoneField id="org-timezone" label={t("timezone")} value={timezone} options={catalog.data.timezones} onChange={setTimezone} />
          <Button type="submit" className="w-full" disabled={mutation.isPending || !ready}>
            {t("submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function BrandForm({
  organization,
  onCreated,
  onError,
}: {
  organization: Organization;
  onCreated: (brand: Brand) => Promise<void>;
  onError: (code: string) => void;
}) {
  const t = useTranslations("brand");
  const brands = useTranslations("brands");
  const segmentsT = useTranslations();
  const catalog = useCatalog();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [locale, setLocale] = useState(organization.default_locale);
  const [timezone, setTimezone] = useState(organization.timezone);
  const [segmentId, setSegmentId] = useState("");
  const localeOptions = organization.supported_locales.length > 0 ? organization.supported_locales : (catalog.data?.locales ?? []);
  const segmentsQuery = useQuery({
    queryKey: ["segments"],
    queryFn: () => api<{ segments: Segment[] }>("/v1/segments"),
  });

  const mutation = useMutation({
    mutationFn: () =>
      api<{ brand: Brand }>("/v1/brands", {
        method: "POST",
        body: JSON.stringify({
          organization_id: organization.id,
          name,
          website_url: website,
          default_locale: locale,
          timezone,
          segment_id: segmentId,
        }),
      }),
    onSuccess: (data) => onCreated(data.brand),
    onError: (error) => onError(error instanceof ApiError ? error.code : "internal_error"),
  });

  if (!catalog.data) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{brands("create")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <TextField id="brand-name" label={t("name")} value={name} onChange={setName} />
          <TextField id="brand-website" label={t("website")} value={website} onChange={setWebsite} optional />
          <div className="space-y-2">
            <Label htmlFor="brand-segment">{t("segment")}</Label>
            <Select value={segmentId || undefined} onValueChange={setSegmentId}>
              <SelectTrigger id="brand-segment">
                <SelectValue placeholder={t("segment")} />
              </SelectTrigger>
              <SelectContent>
                {(segmentsQuery.data?.segments ?? []).map((segment) => (
                  <SelectItem key={segment.id} value={segment.id}>
                    {segmentsT(segment.name_key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <CodeSelect id="brand-locale" label={t("locale")} kind="locale" value={locale} options={localeOptions} onChange={setLocale} />
          <TimezoneField id="brand-timezone" label={t("timezone")} value={timezone} options={catalog.data.timezones} onChange={setTimezone} />
          <Button type="submit" className="w-full" disabled={mutation.isPending || !name || !locale || !timezone || !segmentId}>
            {t("submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  optional,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} required={!optional} />
    </div>
  );
}
