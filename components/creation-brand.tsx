"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useAccount } from "@/components/use-account";
import type { Brand } from "@/lib/api";

type CreationBrandStatus = "loading" | "empty" | "ready";

type CreationBrandValue = {
  brands: Brand[];
  status: CreationBrandStatus;
};

const CreationBrandContext = createContext<CreationBrandValue | null>(null);

export function CreationBrandProvider({ children }: { children: ReactNode }) {
  const { brands, loading } = useAccount();
  const items = brands.data?.brands ?? [];
  const status: CreationBrandStatus =
    loading || brands.isLoading ? "loading" : items.length === 0 ? "empty" : "ready";
  const value = useMemo(() => ({ brands: items, status }), [items, status]);

  return <CreationBrandContext.Provider value={value}>{children}</CreationBrandContext.Provider>;
}

export function useCreationBrand() {
  const value = useContext(CreationBrandContext);
  if (!value) {
    throw new Error("useCreationBrand must be used within CreationBrandProvider");
  }
  return value;
}
