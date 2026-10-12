"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { AppShell, PageCreateAction } from "@/components/app-shell";
import { useCatalog, useCodeLabels } from "@/components/catalog-fields";
import { ConfirmAlertDialog } from "@/components/confirm-alert-dialog";
import { DataTable, useListQuery, type ListColumn } from "@/components/data-table";
import { BrandForm, OrganizationForm } from "@/components/setup-forms";
import { useAccount } from "@/components/use-account";
import { Button } from "@/components/ui/button";
import { ApiError, api, type Brand, type ListMeta, type Segment } from "@/lib/api";
import { appToast } from "@/lib/app-toast";

export function BrandsScreen() {
  const t = useTranslations("brands");
  const { organization } = useAccount();

  return (
    <AppShell
      title={t("title")}
      action={organization ? <PageCreateAction href="/brands/new" label={t("create")} /> : null}
    >
      <BrandsBody />
    </AppShell>
  );
}

export function NewBrandScreen() {
  const t = useTranslations("brands");

  return (
    <AppShell title={t("create")}>
      <NewBrandBody />
    </AppShell>
  );
}

function BrandsBody() {
  const t = useTranslations("brands");
  const lists = useTranslations("lists");
  const errors = useTranslations("errors");
  const segmentsT = useTranslations();
  const labels = useCodeLabels();
  const catalog = useCatalog();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { organization } = useAccount();
  const list = useListQuery({ defaultSort: "created_at", filterKeys: ["locale", "segment_id"] });
  const segmentsQuery = useQuery({
    queryKey: ["segments"],
    queryFn: () => api<{ segments: Segment[] }>("/v1/segments"),
  });
  const brands = useQuery({
    queryKey: ["brands", organization?.id, list.queryString],
    queryFn: () => api<{ brands: Brand[] } & ListMeta>(`/v1/organizations/${organization?.id}/brands?${list.queryString}`),
    enabled: Boolean(organization?.id),
  });
  const segmentLabel = (brand: Brand) => {
    const segments = segmentsQuery.data?.segments ?? [];
    const match =
      segments.find((item) => item.id === brand.segment_id) ??
      segments.find((item) => item.code === brand.segment_code);
    return match ? segmentsT(match.name_key) : "—";
  };

  const remove = useMutation({
    mutationFn: (brandId: string) => api(`/v1/brands/${brandId}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["brands"] });
    },
    onError: (error) => {
      const code = error instanceof ApiError ? error.code : "internal_error";
      appToast.error(errors(code === "not_found" ? "not_found" : "internal_error"));
    },
  });

  if (!organization) {
    return (
      <>
        <OrganizationForm
          onError={(code) => appToast.error(errors(code as "invalid_input"))}
          onCreated={async () => {
            await queryClient.invalidateQueries({ queryKey: ["organizations"] });
          }}
        />
      </>
    );
  }

  const items = brands.data?.brands ?? [];
  const columns: ListColumn<Brand>[] = [
    { key: "name", header: t("columns.name"), sortable: true, cell: (brand) => brand.name },
    {
      key: "segment",
      header: t("columns.segment"),
      cell: (brand) => segmentLabel(brand),
    },
    {
      key: "actions",
      header: t("columns.actions"),
      cell: (brand) => (
        <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
          <ConfirmAlertDialog
            title={t("remove")}
            description={t("removeConfirm")}
            cancelLabel={t("cancel")}
            confirmLabel={t("remove")}
            onConfirm={() => remove.mutate(brand.id)}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                aria-label={t("remove")}
                disabled={remove.isPending}
              >
                <Trash />
              </Button>
            }
          />
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-4">
      <DataTable
        rows={items}
        columns={columns}
        total={brands.data?.total ?? 0}
        loading={brands.isLoading}
        list={list}
        searchLabel={lists("search")}
        emptyLabel={t("empty")}
        noResultsLabel={t("noResults")}
        filters={[
          {
            key: "segment_id",
            label: t("columns.segment"),
            allLabel: lists("all"),
            options: (segmentsQuery.data?.segments ?? []).map((segment) => ({
              value: segment.id,
              label: segmentsT(segment.name_key),
            })),
          },
          {
            key: "locale",
            label: t("columns.locale"),
            allLabel: lists("all"),
            options: (catalog.data?.locales ?? []).map((code) => ({ value: code, label: labels("locale", code) })),
          },
        ]}
        onRowClick={(brand) => router.push(`/brands/${brand.id}`)}
      />
    </section>
  );
}

function NewBrandBody() {
  const errors = useTranslations("errors");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { organization, loading } = useAccount();

  useEffect(() => {
    if (!loading && !organization) {
      router.replace("/brands");
    }
  }, [loading, organization, router]);

  if (!organization) {
    return null;
  }

  return (
    <section className="space-y-4">
      <BrandForm
        organization={organization}
        onError={(code) => appToast.error(errors(code as "invalid_input"))}
        onCreated={async (brand) => {
          await queryClient.invalidateQueries({ queryKey: ["brands", organization.id] });
          router.push(`/brands/${brand.id}`);
        }}
      />
    </section>
  );
}
