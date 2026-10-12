"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, type ReactNode } from "react";

import { useCreationBrand } from "@/components/creation-brand";
import { FilterPills, type ListFilter } from "@/components/data-table";
import { Button } from "@/components/ui/button";

export function CreationFrame({ children }: { children: ReactNode }) {
  const t = useTranslations("creation");
  const { status } = useCreationBrand();

  if (status === "loading") {
    return null;
  }

  if (status === "empty") {
    return (
      <section className="space-y-4">
        <p className="text-sm text-ink/70">{t("needBrand")}</p>
        <Button asChild>
          <Link href="/brands/new">{t("createBrand")}</Link>
        </Button>
      </section>
    );
  }

  return <section className="space-y-4">{children}</section>;
}

export function useBrandQuery() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const brandId = params.get("brand") ?? "";
  const setBrandId = useCallback(
    (id: string) => {
      const search = new URLSearchParams(params.toString());
      if (id) {
        search.set("brand", id);
      } else {
        search.delete("brand");
      }
      const query = search.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );
  return { brandId, setBrandId };
}

export function BrandFilter() {
  const t = useTranslations("creation");
  const lists = useTranslations("lists");
  const { brands } = useCreationBrand();
  const { brandId, setBrandId } = useBrandQuery();
  const filter: ListFilter = {
    key: "brand",
    label: t("brand"),
    allLabel: lists("all"),
    options: brands.map((brand) => ({ value: brand.id, label: brand.name })),
  };
  return (
    <FilterPills
      controlsId="creation-brand"
      filters={[filter]}
      values={{ brand: brandId }}
      onChange={(_, value) => setBrandId(value)}
    />
  );
}
