"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAutoSave } from "@/hooks/use-auto-save";
import { ApiError, api, type BrandInterview } from "@/lib/api";

const fields = ["differentiators", "proofs", "faqs", "opinions", "forbidden"] as const;

type Field = (typeof fields)[number];

export function BrandInterviewForm({ brandId }: { brandId: string }) {
  const t = useTranslations("brandInterview");
  const workspace = useTranslations("brandWorkspace");
  const errors = useTranslations("errors");
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BrandInterview | null>(null);
  const [dirty, setDirty] = useState(false);

  const query = useQuery({
    queryKey: ["interview", brandId],
    queryFn: () => api<{ interview: BrandInterview }>(`/v1/brands/${brandId}/interview`),
  });

  if (form === null && query.data) {
    setForm(query.data.interview);
  }

  const { touch } = useAutoSave({
    payload: form,
    dirty,
    toastId: `brand-interview-${brandId}`,
    successMessage: workspace("saved"),
    errorMessage: (error) =>
      error instanceof ApiError && errors.has(error.code) ? errors(error.code) : errors("internal_error"),
    save: (value) =>
      api<{ interview: BrandInterview }>(`/v1/brands/${brandId}/interview`, {
        method: "PUT",
        body: JSON.stringify(
          Object.fromEntries(fields.map((field) => [field, value[field].map((item) => item.trim()).filter(Boolean)])),
        ),
      }),
    onSuccess: (result, meta) => {
      queryClient.setQueryData(["interview", brandId], result);
      if (meta.isCurrent) {
        setDirty(false);
      }
    },
  });

  if (!form) {
    return null;
  }

  function update(field: Field, raw: string) {
    if (!form) {
      return;
    }
    touch();
    setDirty(true);
    setForm({ ...form, [field]: raw.split("\n") });
  }

  return (
    <section className="space-y-3 rounded-xl border border-ink/10 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{t("title")}</h3>
        <p className="text-xs text-ink/60">{t("intro")}</p>
      </div>
      {fields.map((field) => (
        <div key={field} className="space-y-2">
          <Label htmlFor={`interview-${field}-${brandId}`}>{t(`${field}.label`)}</Label>
          <Textarea
            id={`interview-${field}-${brandId}`}
            value={form[field].join("\n")}
            rows={3}
            placeholder={t(`${field}.hint`)}
            onChange={(event) => update(field, event.target.value)}
          />
        </div>
      ))}
    </section>
  );
}
