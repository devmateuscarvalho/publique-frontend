"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";

import { BrandBrain } from "@/components/brand-brain";
import { BrandVisualCard } from "@/components/brand-visual";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAutoSave } from "@/hooks/use-auto-save";
import { ApiError, api, type Brand, type Segment } from "@/lib/api";
import { appToast } from "@/lib/app-toast";

export function BrandWorkspace({
  brand,
  segments,
  footer,
}: {
  brand: Brand;
  segments: Segment[];
  footer?: ReactNode;
}) {
  const t = useTranslations("brandWorkspace");
  const brandT = useTranslations("brandEditor");
  const segmentsT = useTranslations();
  const errors = useTranslations("errors");
  const queryClient = useQueryClient();

  const [name, setName] = useState(brand.name);
  const [segmentId, setSegmentId] = useState(brand.segment_id || "");
  const [nameDirty, setNameDirty] = useState(false);
  const toastId = `brand-${brand.id}`;

  useEffect(() => {
    setName(brand.name);
    setNameDirty(false);
  }, [brand.name]);

  useEffect(() => {
    setSegmentId(brand.segment_id || "");
  }, [brand.segment_id]);

  function applyBrand(result: { brand: Brand }) {
    queryClient.setQueryData(["brand", brand.id], { brand: result.brand });
    void queryClient.invalidateQueries({ queryKey: ["brands"] });
  }

  function errorText(error: unknown) {
    const code = error instanceof ApiError ? error.code : "internal_error";
    const known = ["invalid_input", "not_found", "internal_error"] as const;
    return errors(known.includes(code as (typeof known)[number]) ? (code as (typeof known)[number]) : "internal_error");
  }

  const trimmedName = name.trim();
  const { touch } = useAutoSave({
    payload: trimmedName,
    dirty: nameDirty && trimmedName !== "" && trimmedName !== brand.name,
    toastId,
    successMessage: t("saved"),
    errorMessage: errorText,
    save: (value) =>
      api<{ brand: Brand }>(`/v1/brands/${brand.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: value }),
      }),
    onSuccess: (result, meta) => {
      applyBrand(result);
      if (meta.isCurrent) {
        setNameDirty(false);
      }
    },
  });

  const patchSegment = useMutation({
    mutationFn: (segment_id: string) =>
      api<{ brand: Brand }>(`/v1/brands/${brand.id}`, {
        method: "PATCH",
        body: JSON.stringify({ segment_id }),
      }),
    onSuccess: (result) => {
      applyBrand(result);
      appToast.success(t("saved"), toastId);
    },
    onError: (error) => appToast.error(errorText(error), toastId),
  });

  function onSegmentChange(next: string) {
    setSegmentId(next);
    if (!next || next === brand.segment_id) {
      return;
    }
    patchSegment.mutate(next);
  }

  return (
    <section className="w-full space-y-4">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList aria-label={t("section")}>
          <TabsTrigger value="profile">{t("sections.profile")}</TabsTrigger>
          <TabsTrigger value="visual">{t("sections.visual")}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`brand-name-${brand.id}`}>{brandT("name")}</Label>
            <Input
              id={`brand-name-${brand.id}`}
              className="min-h-11"
              value={name}
              maxLength={120}
              required
              onChange={(event) => {
                touch();
                setNameDirty(true);
                setName(event.target.value);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`brand-segment-${brand.id}`}>{brandT("segment")}</Label>
            <Select value={segmentId || undefined} onValueChange={onSegmentChange} disabled={patchSegment.isPending}>
              <SelectTrigger id={`brand-segment-${brand.id}`} className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {segments.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {segmentsT(item.name_key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-ink/70">{brandT("segmentHint")}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{brandT("scan")}</CardTitle>
            </CardHeader>
            <CardContent>
              <BrandBrain brand={brand} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visual">
          <BrandVisualCard brandId={brand.id} autoSave />
        </TabsContent>
      </Tabs>

      {footer}
    </section>
  );
}
