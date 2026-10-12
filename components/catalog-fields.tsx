"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";

export type Catalog = {
  locales: string[];
  countries: string[];
  currencies: string[];
  timezones: string[];
};

export function useCatalog() {
  return useQuery({
    queryKey: ["catalog"],
    queryFn: () => api<Catalog>("/v1/catalog"),
    staleTime: Infinity,
  });
}

export function useCodeLabels() {
  const locale = useLocale();
  return useMemo(() => {
    const language = new Intl.DisplayNames([locale], { type: "language" });
    const region = new Intl.DisplayNames([locale], { type: "region" });
    const currency = new Intl.DisplayNames([locale], { type: "currency" });
    return (kind: "country" | "currency" | "locale" | "timezone", code: string) => {
      try {
        if (kind === "country") {
          return region.of(code) ?? code;
        }
        if (kind === "currency") {
          return `${currency.of(code) ?? code} (${code})`;
        }
        if (kind === "locale") {
          const [lang, area] = code.split("-");
          const languageName = language.of(lang) ?? lang;
          const areaName = area ? (region.of(area) ?? area) : "";
          return areaName ? `${languageName} (${areaName})` : languageName;
        }
      } catch {
        return code.replaceAll("_", " ");
      }
      return code.replaceAll("_", " ");
    };
  }, [locale]);
}

export function CodeSelect({
  id,
  label,
  value,
  onChange,
  options,
  kind,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  kind: "country" | "currency" | "locale";
}) {
  const t = useTranslations("catalog");
  const labels = useCodeLabels();
  const sorted = [...options].sort((left, right) =>
    labels(kind, left).localeCompare(labels(kind, right), undefined, { sensitivity: "base" }),
  );

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={t("choose")} />
        </SelectTrigger>
        <SelectContent>
          {sorted.map((code) => (
            <SelectItem key={code} value={code}>
              {labels(kind, code)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function LocaleChecks({
  legend,
  options,
  selected,
  locked,
  onChange,
}: {
  legend: string;
  options: string[];
  selected: string[];
  locked: string;
  onChange: (next: string[]) => void;
}) {
  const labels = useCodeLabels();

  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-medium">{legend}</legend>
      {options.map((code) => (
        <label key={code} className="flex min-h-11 items-center gap-3 text-base">
          <input
            type="checkbox"
            className="size-5"
            checked={selected.includes(code)}
            disabled={code === locked}
            onChange={() => {
              if (code === locked) {
                return;
              }
              onChange(selected.includes(code) ? selected.filter((item) => item !== code) : [...selected, code]);
            }}
          />
          {labels("locale", code)}
        </label>
      ))}
    </fieldset>
  );
}

export function TimezoneField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  const t = useTranslations("catalog");
  const [filter, setFilter] = useState("");
  const needle = filter.trim().toLowerCase().replaceAll(" ", "_");
  const visible = options.filter((zone) => zone.toLowerCase().includes(needle));
  const shown = value && !visible.includes(value) ? [value, ...visible] : visible;

  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-filter`}>{label}</Label>
      <Input
        id={`${id}-filter`}
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder={t("timezoneFilter")}
      />
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={t("choose")} />
        </SelectTrigger>
        <SelectContent>
          {shown.map((zone) => (
            <SelectItem key={zone} value={zone}>
              {zone.replaceAll("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
