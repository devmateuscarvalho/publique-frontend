"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { AppShell } from "@/components/app-shell";
import { BrandWorkspace } from "@/components/brand-workspace";
import { useAccount } from "@/components/use-account";
import { api, type Brand, type Segment } from "@/lib/api";

export function BrandEditor() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const brandQuery = useQuery({
    queryKey: ["brand", id],
    queryFn: () => api<{ brand: Brand }>(`/v1/brands/${id}`),
    retry: false,
    enabled: Boolean(id),
  });
  const title = brandQuery.data?.brand.name ?? "…";

  return (
    <AppShell title={title}>
      <BrandEditorBody brandId={id} />
    </AppShell>
  );
}

function BrandEditorBody({ brandId }: { brandId: string }) {
  const errors = useTranslations("errors");
  const { loading } = useAccount();
  const brandQuery = useQuery({
    queryKey: ["brand", brandId],
    queryFn: () => api<{ brand: Brand }>(`/v1/brands/${brandId}`),
    retry: false,
    enabled: Boolean(brandId) && !loading,
  });
  const segmentsQuery = useQuery({
    queryKey: ["segments"],
    queryFn: () => api<{ segments: Segment[] }>("/v1/segments"),
  });

  if (brandQuery.isLoading) {
    return null;
  }

  if (brandQuery.isError || !brandQuery.data) {
    return <p className="text-sm text-ink/70">{errors("not_found")}</p>;
  }

  return <BrandWorkspace brand={brandQuery.data.brand} segments={segmentsQuery.data?.segments ?? []} />;
}
